"use server";

import crypto from "node:crypto";
import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";

function text(value: FormDataEntryValue | null, field: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${field} is required.`);

  const normalised = value.trim().replace(/[<>]/g, "");
  if (!normalised || normalised.length > maxLength) {
    throw new Error(`${field} must be between 1 and ${maxLength} characters.`);
  }

  return normalised;
}

function optionalText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalised = value.trim().replace(/[<>]/g, "");
  if (normalised.length > maxLength) throw new Error(`Value must be at most ${maxLength} characters.`);
  return normalised;
}

function navigationHref(value: FormDataEntryValue | null) {
  const href = text(value, "Navigation URL", 2_000);
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;

  try {
    const url = new URL(href);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // Return the same user-facing validation error below.
  }

  throw new Error("Navigation URLs must be an internal path, page anchor, or HTTPS URL.");
}

function navigationSortOrder(value: FormDataEntryValue | null) {
  const sortOrder = typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    throw new Error("Navigation sort order must be a whole number between 0 and 10000.");
  }

  return sortOrder;
}

export async function createNavigationItem(formData: FormData) {
  const admin = await requireAdmin();
  const label = text(formData.get("label"), "Navigation label", 120);
  const href = navigationHref(formData.get("href"));
  const parentId = optionalText(formData.get("parentId"), 200);
  const sortOrder = navigationSortOrder(formData.get("sortOrder"));
  const id = crypto.randomUUID();

  await prisma.$transaction([
    prisma.navigationItem.create({
      data: { id, label, href, parentId, sortOrder, visible: true },
    }),
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "navigation_item_created",
        entityType: "NavigationItem",
        entityId: id,
        metadata: { label, href, parentId, sortOrder },
      },
    }),
  ]);

  revalidatePath("/admin/navigation");
  revalidatePath("/", "layout");
}

export async function updateNavigationItem(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData.get("id"), "Navigation item ID", 200);
  const label = text(formData.get("label"), "Navigation label", 120);
  const href = navigationHref(formData.get("href"));
  const sortOrder = navigationSortOrder(formData.get("sortOrder"));
  const visible = formData.get("visible") === "true";

  await prisma.$transaction([
    prisma.navigationItem.update({
      where: { id },
      data: { label, href, sortOrder, visible },
    }),
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "navigation_item_updated",
        entityType: "NavigationItem",
        entityId: id,
        metadata: { label, href, sortOrder, visible },
      },
    }),
  ]);

  revalidatePath("/admin/navigation");
  revalidatePath("/", "layout");
}

export async function deleteNavigationItem(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData.get("id"), "Navigation item ID", 200);
  const existing = await prisma.navigationItem.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.$transaction([
    prisma.navigationItem.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: "navigation_item_deleted",
        entityType: "NavigationItem",
        entityId: id,
        metadata: { label: existing.label, href: existing.href, parentId: existing.parentId },
      },
    }),
  ]);

  revalidatePath("/admin/navigation");
  revalidatePath("/", "layout");
}
