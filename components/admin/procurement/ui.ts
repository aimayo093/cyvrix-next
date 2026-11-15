/** Shared class names for the procurement admin pages, matching /admin/ai-drafts. */
export const field =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]";
export const label = "block text-xs font-bold uppercase tracking-wide text-slate-500";
export const card = "rounded-2xl border border-slate-200 bg-white p-5";
export const primaryButton =
  "inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#041635] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0f5aab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9";
export const secondaryButton =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#041635] transition-colors hover:border-[#2691F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] lg:min-h-9";
export const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold";

export const when = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(d) : "—";

export const short = (hash: string | null | undefined) => (hash ? `${hash.slice(0, 12)}…` : "—");

export const ACTION_LABEL: Record<string, string> = {
  submit_tender: "Submit tender",
  submit_application: "Submit partnership application",
  register_account: "Register supplier account",
  send_email: "Send email",
  send_quote: "Send quotation",
  accept_contract: "Accept contract",
  accept_assignment: "Accept assignment",
  spend: "Spend money",
};

export const VERSION_STATUS_LABEL: Record<string, string> = {
  verified: "Verified existing document",
  ai_draft: "AI draft (not evidence)",
  founder_approved: "Founder approved",
  certified_evidence: "Independently certified evidence",
  superseded: "Superseded",
};

export const CATEGORY_LABEL: Record<string, string> = {
  field_engineering: "A · Field engineering and IT outsourcing",
  government_defence: "B · Government, defence and secure delivery",
  manufacturer: "C · Manufacturer service programmes",
  enterprise_distribution: "D · Enterprise suppliers and distribution",
  buyer: "Buyer",
};
