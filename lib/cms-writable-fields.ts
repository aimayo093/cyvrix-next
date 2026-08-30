/**
 * What a CMS API request is allowed to set.
 *
 * The route spread the parsed body straight into `model.create({ data: { ...body } })`.
 * Any authenticated CMS administrator could therefore write any column on any
 * model, including columns no form in the admin exposes — which is a wider
 * permission than the interface implies anyone has.
 *
 * The columns that matter are the ones encoding a decision rather than content.
 * `docs/DECISIONS.md` records that testimonials, partner logos and client logos
 * stay unpublished until each record has been checked for evidence, permission
 * to name the client, and expiry. That gate is the reason the site does not
 * currently show any of them. A request body that could set
 * `verificationStatus: "VERIFIED"` walks straight past it, and the resulting
 * page would make a claim nobody verified — which is the single thing this
 * codebase is most careful about.
 *
 * So the body is filtered rather than trusted. Content fields pass; fields that
 * record a judgement are refused, and the refusal is reported rather than
 * silently dropped, because an administrator who set something and saw it
 * ignored would reasonably file a bug.
 */

/**
 * Fields that record a decision, an attribution or a time the system owns.
 *
 * Matched by name across every model, because the same names mean the same
 * thing throughout the schema, and a per-model list is a list that goes stale
 * the next time a model is added.
 */
const PROTECTED_FIELDS = new Set([
  // The trust gate. Set through the review workflow, never through an API body.
  "verificationStatus",
  "verificationReference",
  "verifiedAt",
  "verifiedBy",
  "permissionConfirmed",
  "permissionConfirmedAt",
  "permissionEvidenceUrl",

  // Identity and audit. The route already strips id and createdAt on PATCH;
  // this makes it true on create as well, and adds the ones it missed.
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "deletedAt",
]);

/**
 * Prefixes that catch the same idea under a different name.
 *
 * A new model calling it `reviewedBy` rather than `verifiedBy` would otherwise
 * slip through, and the failure would be silent until someone noticed a
 * testimonial on the site that nobody had approved.
 */
const PROTECTED_PREFIXES = ["verif", "permission", "approvedBy", "reviewedBy", "signedOff"];

export type FilterResult = {
  /** The body with protected fields removed. */
  data: Record<string, unknown>;
  /** What was removed, so the caller can be told rather than left guessing. */
  refused: string[];
};

export function filterWritableFields(body: Record<string, unknown>): FilterResult {
  const data: Record<string, unknown> = {};
  const refused: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    const isProtected =
      PROTECTED_FIELDS.has(key) ||
      PROTECTED_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix.toLowerCase()));

    if (isProtected) refused.push(key);
    else data[key] = value;
  }

  return { data, refused };
}

/** What to tell a caller whose request carried fields this API will not set. */
export function refusalMessage(refused: string[]): string {
  return (
    `These fields cannot be set through the CMS API and were not written: ${refused.join(", ")}. ` +
    `Verification and permission are recorded through the review workflow, and identity and audit ` +
    `columns are set by the system.`
  );
}
