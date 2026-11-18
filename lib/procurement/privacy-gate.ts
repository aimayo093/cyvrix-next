/**
 * Whether the published privacy policy covers buyer contacts from public
 * tenders (founder decision D12): a feed may not be switched on before it does,
 * because switching one on starts storing those contacts.
 *
 * The section is recognised by its heading phrase from
 * docs/procurement/privacy-notice-draft.md ("Business contacts from public
 * tenders"). Pure, so it is tested without a database.
 */
export const PRIVACY_SECTION_MARKER = "public tenders";

export function privacyNoticeCoversTenderContacts(page: { status: string; body: string | null } | null): boolean {
  if (!page || page.status !== "PUBLISHED" || !page.body) return false;
  return page.body.toLowerCase().includes(PRIVACY_SECTION_MARKER);
}
