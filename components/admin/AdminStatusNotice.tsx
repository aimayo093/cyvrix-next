import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * The outcome of the last form submission, read from `?status=&message=`.
 *
 * Admin actions report a refusal by redirecting back with these parameters
 * (see returnWithError in lib/admin-actions.ts) rather than throwing, so the
 * reason appears beside the form instead of on a generic error page.
 */
export function AdminStatusNotice({ status, message }: { status?: string; message?: string }) {
  if (status !== "success" && status !== "error") return null;
  const success = status === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-xl border p-4 ${
        success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
      )}
      <div>
        <p className="text-sm font-black">{success ? "Done" : "Could not complete"}</p>
        {message && <p className="mt-0.5 text-xs font-semibold leading-relaxed">{message}</p>}
      </div>
    </div>
  );
}
