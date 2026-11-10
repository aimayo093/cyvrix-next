"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Error boundary for admin pages. Renders inside the admin layout, so the
 * sidebar stays and the administrator is not dropped onto the public site's
 * "contact us" error screen. It catches errors from pages only: an error in
 * app/admin/layout.tsx itself (the sign-in check) is above this boundary and
 * reaches app/error.tsx.
 *
 * Production builds replace a server error's message with a digest, so the
 * digest is shown as the reference to look up in the logs. Expected refusals
 * (validation, permissions) should never reach here: actions report those on
 * the page via returnWithError in lib/admin-actions.ts.
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error("[admin-error]", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div role="alert" className="max-w-2xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-outfit text-xl font-black text-[#041635]">This admin page hit an unexpected error.</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            Nothing you entered was necessarily lost, but the last action may not have completed. Try again, and if it
            keeps happening, check the server logs for the reference below.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs font-semibold text-slate-500">Reference: {error.digest}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#041635] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2691F0]"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-[#041635] transition-colors hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
