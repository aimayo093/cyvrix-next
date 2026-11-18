import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { scanDocument } from "@/lib/document-scan";
import { evidenceVerdict } from "./approval-core";
import { recordDateChanges } from "./deadlines";
import { requirementProblem, type RequirementKind, type RequirementStatus } from "./requirements";
import { audit } from "./service";
import { removeDocument, storeDocument } from "./storage";
import { fetchPublicDocument, noticeDocuments } from "./tender-documents";

/**
 * Database side of Phase 4: deadlines, tender documents and the requirements
 * checklist. Every write is audited in the same transaction.
 */

type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; reason: string };
const fail = (reason: string) => ({ ok: false as const, reason });

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
};

// ---------------------------------------------------------------- deadlines

/** A person sets or corrects the dates (for leads and quotes with no notice, or a notice that left them out). */
export async function setDeadlines(input: {
  opportunityId: string;
  deadlineAt: Date | null;
  clarificationDeadlineAt: Date | null;
  userId: string;
}): Promise<Result> {
  if (input.deadlineAt && input.clarificationDeadlineAt && input.clarificationDeadlineAt > input.deadlineAt) {
    return fail("The clarification deadline must come before the submission deadline.");
  }
  return prisma.$transaction(async (tx) => {
    const opp = await tx.opportunity.findUnique({ where: { id: input.opportunityId }, select: { deadlineAt: true, clarificationDeadlineAt: true } });
    if (!opp) return fail("That opportunity could not be found.");
    const changes = recordDateChanges(opp, input);
    if (!changes.length) return fail("Nothing changed. Enter a new date.");
    await tx.opportunity.update({
      where: { id: input.opportunityId },
      data: {
        ...(input.deadlineAt ? { deadlineAt: input.deadlineAt } : {}),
        ...(input.clarificationDeadlineAt ? { clarificationDeadlineAt: input.clarificationDeadlineAt } : {}),
      },
    });
    for (const c of changes) await audit(tx, input.userId, "opportunity.deadline_changed", "Opportunity", input.opportunityId, { ...c, by: "person" });
    return { ok: true };
  });
}

// ---------------------------------------------------------------- documents

/** Lists the documents the opportunity's notices publish. Existing rows are kept as they are. */
export async function refreshNoticeDocuments(opportunityId: string, userId: string): Promise<Result<number>> {
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { ocid: true } });
  if (!opp) return fail("That opportunity could not be found.");
  if (!opp.ocid) return fail("This record did not come from a published notice. Upload the tender documents instead.");
  const notices = await prisma.procurementNotice.findMany({ where: { ocid: opp.ocid }, orderBy: { fetchedAt: "desc" }, take: 20, select: { raw: true } });
  const docs = noticeDocuments(notices.map((n) => n.raw));
  if (!docs.length) return { ok: true, value: 0 };
  const added = await prisma.$transaction(async (tx) => {
    const result = await tx.tenderDocument.createMany({
      data: docs.map((d) => ({
        id: crypto.randomUUID(),
        opportunityId,
        title: d.title,
        documentType: d.documentType,
        sourceUrl: d.url,
        origin: "notice",
        status: "listed",
        createdById: userId,
      })),
      skipDuplicates: true,
    });
    if (result.count) await audit(tx, userId, "tender_document.listed", "Opportunity", opportunityId, { added: result.count });
    return result.count;
  });
  return { ok: true, value: added };
}

type Stored = { storagePath: string; filename: string; sha256: string; sizeBytes: number; scan: Prisma.InputJsonValue };

/** Scans and stores a file in the private bucket. Nothing is stored if the scan refuses it. */
async function scanAndStore(opportunityId: string, documentId: string, buffer: Buffer, filename: string): Promise<{ ok: true; value: Stored } | { ok: false; reason: string }> {
  const verdict = await scanDocument({ buffer, filename });
  if (!verdict.accepted || !verdict.kind) return fail(`Not stored: ${verdict.reasons[0] ?? "the file was not recognised as a document."}`);
  const storagePath = `tenders/${opportunityId}/${documentId}.${verdict.kind}`;
  const stored = await storeDocument(storagePath, buffer, CONTENT_TYPES[verdict.kind]);
  if (!stored.ok) return stored;
  return {
    ok: true,
    value: {
      storagePath,
      filename,
      sha256: verdict.sha256,
      sizeBytes: verdict.sizeBytes,
      scan: { kind: verdict.kind, notes: verdict.notes, externallyScanned: verdict.externallyScanned },
    },
  };
}

/**
 * Fetches a listed document from an official notice service and stores a
 * scanned copy. A refusal is recorded with its reason, so the founder knows to
 * download and upload it by hand.
 */
export async function fetchTenderDocument(documentId: string, userId: string, fetchImpl?: Parameters<typeof fetchPublicDocument>[1]): Promise<Result> {
  const doc = await prisma.tenderDocument.findUnique({ where: { id: documentId } });
  if (!doc) return fail("That document could not be found.");
  if (doc.status === "stored") return fail("A copy is already stored.");
  if (!doc.sourceUrl) return fail("This document has no link to fetch.");

  const fetched = await fetchPublicDocument(doc.sourceUrl, fetchImpl);
  const refuse = async (reason: string) => {
    await prisma.$transaction(async (tx) => {
      await tx.tenderDocument.updateMany({ where: { id: doc.id, status: { not: "stored" } }, data: { status: "refused", refusal: reason.slice(0, 500) } });
      await audit(tx, userId, "tender_document.refused", "TenderDocument", doc.id, { opportunityId: doc.opportunityId, reason: reason.slice(0, 200) });
    });
    return fail(reason);
  };
  if (!fetched.ok) return refuse(fetched.reason);

  const stored = await scanAndStore(doc.opportunityId, doc.id, fetched.buffer, fetched.filename);
  if (!stored.ok) return refuse(stored.reason);

  return saveStoredCopy(doc.id, doc.opportunityId, stored.value, userId, { finalUrl: fetched.finalUrl });
}

/** Records the stored copy, or removes the file if another request stored one first. */
async function saveStoredCopy(documentId: string, opportunityId: string, s: Stored, userId: string, meta: Record<string, unknown>): Promise<Result> {
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const r = await tx.tenderDocument.updateMany({
        where: { id: documentId, status: { not: "stored" } },
        data: { status: "stored", refusal: null, storedAt: new Date(), ...s },
      });
      if (r.count !== 1) return false;
      await audit(tx, userId, "tender_document.stored", "TenderDocument", documentId, { opportunityId, sha256: s.sha256, sizeBytes: s.sizeBytes, ...meta });
      return true;
    });
    if (!saved) {
      await removeDocument(s.storagePath);
      return fail("A copy was stored by someone else just now.");
    }
    return { ok: true };
  } catch (error) {
    // Look before removing: a file whose record exists must never be deleted.
    const row = await prisma.tenderDocument.findUnique({ where: { id: documentId }, select: { storagePath: true } }).catch(() => null);
    if (row?.storagePath !== s.storagePath) await removeDocument(s.storagePath);
    throw error;
  }
}

/** A document the founder downloaded from a buyer portal and uploads here. */
export async function uploadTenderDocument(input: {
  opportunityId: string;
  title: string;
  documentType: string | null;
  sourceUrl: string | null;
  buffer: Buffer;
  filename: string;
  userId: string;
}): Promise<Result> {
  const opp = await prisma.opportunity.findUnique({ where: { id: input.opportunityId }, select: { id: true } });
  if (!opp) return fail("That opportunity could not be found.");
  // An upload for a listed (or refused) notice document fills that row rather than adding a second.
  const listed = input.sourceUrl
    ? await prisma.tenderDocument.findFirst({ where: { opportunityId: input.opportunityId, sourceUrl: input.sourceUrl } })
    : null;
  if (listed?.status === "stored") return fail("A copy of that document is already stored.");
  const id = listed?.id ?? crypto.randomUUID();
  const stored = await scanAndStore(input.opportunityId, id, input.buffer, input.filename);
  if (!stored.ok) return stored;
  if (!listed) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.tenderDocument.create({
          data: {
            id,
            opportunityId: input.opportunityId,
            title: input.title,
            documentType: input.documentType,
            sourceUrl: input.sourceUrl,
            origin: "upload",
            status: "stored",
            storedAt: new Date(),
            createdById: input.userId,
            ...stored.value,
          },
        });
        await audit(tx, input.userId, "tender_document.stored", "TenderDocument", id, { opportunityId: input.opportunityId, sha256: stored.value.sha256, sizeBytes: stored.value.sizeBytes, origin: "upload" });
      });
    } catch (error) {
      await removeDocument(stored.value.storagePath);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("That link is already listed for this opportunity.");
      throw error;
    }
    return { ok: true };
  }
  return saveStoredCopy(id, input.opportunityId, stored.value, input.userId, { origin: "upload" });
}

// ---------------------------------------------------------------- requirements

export async function saveRequirement(input: {
  id?: string;
  opportunityId: string;
  ref: string | null;
  text: string;
  kind: RequirementKind;
  status: RequirementStatus;
  sourceDocumentId: string | null;
  location: string | null;
  evidenceVersionId: string | null;
  notes: string | null;
  userId: string;
}): Promise<Result<string>> {
  const problem = requirementProblem(input);
  if (problem) return fail(problem);
  if (input.evidenceVersionId) {
    const v = await prisma.companyDocumentVersion.findUnique({ where: { id: input.evidenceVersionId }, select: { status: true, expiresAt: true } });
    const usable = evidenceVerdict(v);
    if (!usable.ok) return usable;
  }
  if (input.sourceDocumentId) {
    const d = await prisma.tenderDocument.findUnique({ where: { id: input.sourceDocumentId }, select: { opportunityId: true } });
    if (d?.opportunityId !== input.opportunityId) return fail("That source document belongs to another opportunity.");
  }
  const data = {
    ref: input.ref?.trim().slice(0, 40) || null,
    text: input.text.trim(),
    kind: input.kind,
    status: input.status,
    sourceDocumentId: input.sourceDocumentId,
    location: input.location?.trim().slice(0, 120) || null,
    evidenceVersionId: input.evidenceVersionId,
    notes: input.notes?.trim().slice(0, 2000) || null,
    updatedById: input.userId,
  };
  const id = input.id ?? crypto.randomUUID();
  return prisma.$transaction(async (tx) => {
    if (input.id) {
      const existing = await tx.tenderRequirement.findUnique({ where: { id: input.id }, select: { opportunityId: true, status: true } });
      if (existing?.opportunityId !== input.opportunityId) return fail("That requirement could not be found.");
      await tx.tenderRequirement.update({ where: { id }, data });
      await audit(tx, input.userId, "requirement.updated", "Opportunity", input.opportunityId, { requirementId: id, from: existing.status, to: input.status, kind: input.kind });
    } else {
      await tx.tenderRequirement.create({ data: { id, opportunityId: input.opportunityId, createdById: input.userId, ...data } });
      await audit(tx, input.userId, "requirement.added", "Opportunity", input.opportunityId, { requirementId: id, status: input.status, kind: input.kind });
    }
    return { ok: true as const, value: id };
  });
}
