type TrustPublicationDefaults = {
  verificationStatus?: string | null;
  verificationReference?: string | null;
  evidenceUrl?: string | null;
  evidenceReviewedAt?: Date | string | null;
  evidenceReviewedBy?: string | null;
  expiresAt?: Date | string | null;
  permissionConfirmed?: boolean | null;
  permissionEvidenceUrl?: string | null;
  permissionConfirmedAt?: Date | string | null;
  publicVisibility?: boolean | null;
};

function dateInputValue(value?: Date | string | null) {
  if (!value) return "";

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
}

export function TrustPublicationFields({
  defaults,
  requiresPermission = false,
}: {
  defaults?: TrustPublicationDefaults;
  requiresPermission?: boolean;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <legend className="px-1 text-sm font-black text-[#041635]">Evidence & publication review</legend>
      <p className="text-xs leading-relaxed text-slate-500">
        This record stays off the public site until it is verified, evidenced and explicitly marked for public use.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Verification status
          <select
            name="verificationStatus"
            defaultValue={defaults?.verificationStatus || "PENDING"}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#041635]"
          >
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="EXPIRED">Expired</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Review reference
          <input
            name="verificationReference"
            defaultValue={defaults?.verificationReference || ""}
            placeholder="Certificate, directory or review ID"
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
          />
        </label>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        Evidence URL
        <input
          type="url"
          name="evidenceUrl"
          defaultValue={defaults?.evidenceUrl || ""}
          placeholder="https://…"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Reviewed by
          <input
            name="evidenceReviewedBy"
            defaultValue={defaults?.evidenceReviewedBy || ""}
            placeholder="Reviewer name or role"
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Review date
          <input
            type="date"
            name="evidenceReviewedAt"
            defaultValue={dateInputValue(defaults?.evidenceReviewedAt)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
          />
        </label>
      </div>

      <label className="block text-sm font-bold text-slate-700">
        Expiry date <span className="font-medium text-slate-400">(if applicable)</span>
        <input
          type="date"
          name="expiresAt"
          defaultValue={dateInputValue(defaults?.expiresAt)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
        />
      </label>

      {requiresPermission && (
        <div className="space-y-4 border-t border-blue-100 pt-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              name="permissionConfirmed"
              value="true"
              defaultChecked={Boolean(defaults?.permissionConfirmed)}
              className="h-4 w-4 rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]"
            />
            Permission confirmed for this exact public use
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-bold text-slate-700">
              Permission evidence URL
              <input
                type="url"
                name="permissionEvidenceUrl"
                defaultValue={defaults?.permissionEvidenceUrl || ""}
                placeholder="https://…"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Permission date
              <input
                type="date"
                name="permissionConfirmedAt"
                defaultValue={dateInputValue(defaults?.permissionConfirmedAt)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
              />
            </label>
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 border-t border-blue-100 pt-4 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          name="publicVisibility"
          value="true"
          defaultChecked={Boolean(defaults?.publicVisibility)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]"
        />
        <span>
          Approved for public display
          <span className="mt-0.5 block text-xs font-medium leading-relaxed text-slate-500">
            Saving cannot enable this unless every required review field is complete and the record has not expired.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
