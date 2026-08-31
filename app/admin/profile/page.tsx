import * as React from "react";
import { connection } from "next/server";
import { AlertCircle, CheckCircle2, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  changeAdminPassword,
  confirmTwoFactorEnrolment,
  dismissRecoveryCodes,
  issueNewRecoveryCodes,
  requestEmailVerification,
  startTwoFactorEnrolment,
  turnOffTwoFactor,
  updateAdminProfile,
} from "@/lib/admin-actions";
import { TwoFactorPanel } from "@/components/shared/TwoFactorPanel";
import { beginEnrolment, getTwoFactorState, peekRecoveryCodes, type EnrolmentOffer } from "@/lib/two-factor";
import { Button } from "@/components/shared/Button";
import { PasswordInput } from "@/components/shared/PasswordInput";

export const metadata = { title: "Your Profile" };

type ProfilePageProps = {
  searchParams: Promise<{ status?: string; message?: string; enrol?: string }>;
};

export default function AdminProfilePage(props: ProfilePageProps) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <AdminProfileContent {...props} />
    </React.Suspense>
  );
}

/** "SUPER_ADMIN" to "Super admin". */
function readableRole(role: string): string {
  const spaced = role.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

async function AdminProfileContent({ searchParams }: ProfilePageProps) {
  await connection();
  const admin = await requireAdmin();
  const sp = await searchParams;

  // requireAdmin returns the session projection; the audit trail and account
  // dates come from the record itself.
  const twoFactor = await getTwoFactorState(admin.id);

  // The enrolment screen needs the QR again on every render while it is open,
  // and beginEnrolment issues a fresh secret each time it is called, so it is
  // only called when the pending secret has not yet been confirmed.
  let enrolmentOffer: EnrolmentOffer | null = null;
  if (sp.enrol === "2fa" && !twoFactor.enrolled) {
    enrolmentOffer = await beginEnrolment(admin.id, admin.email);
  }

  // Read without clearing. Cookies may only be modified in an action, and the
  // clear that used to happen here is why this page returned a 500 on the one
  // render that mattered. "I have saved them" clears it.
  const recoveryCodes = await peekRecoveryCodes();

  const [record, recentActivity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: admin.id },
      select: { createdAt: true, twoFactorReady: true, emailVerified: true },
    }),
    prisma.auditLog.findMany({
      where: { userId: admin.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entityType: true, createdAt: true },
    }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-2xl font-black text-[#041635]">Your profile</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          The account you are signed in with, and the credentials that protect it.
        </p>
      </div>

      {sp.status && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            sp.status === "success"
              ? "border-emerald-250 bg-emerald-50 text-emerald-800"
              : "border-rose-250 bg-rose-50 text-rose-800"
          }`}
        >
          {sp.status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div>
            <h2 className="text-sm font-black">
              {sp.status === "success" ? "Saved" : "Could not save"}
            </h2>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed">{sp.message}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#2691F0]" />
              <div>
                <h2 className="font-outfit font-black text-[#041635]">Account details</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Your name appears on audit entries and in the header.
                </p>
              </div>
            </div>

            <form action={updateAdminProfile} className="mt-6 space-y-4">
              <div>
                <label htmlFor="name" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Display name
                </label>
                <input
                  id="name"
                  name="name"
                  maxLength={120}
                  defaultValue={admin.name ?? ""}
                  placeholder="e.g. Paul Iyangbe"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#041635] outline-none transition-colors focus:border-[#2691F0] focus:ring-2 focus:ring-[#2691F0]/20"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Email address
                </label>
                <input
                  id="email"
                  value={admin.email}
                  readOnly
                  aria-describedby="email-note"
                  className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
                />
                <p id="email-note" className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                  This is your sign-in identifier. Changing it needs a verification step, so it is not
                  editable here.
                </p>
              </div>

              <Button type="submit" variant="premium" className="h-auto px-5 py-2.5 text-sm">
                <Save className="h-4 w-4" />
                Save profile
              </Button>
            </form>
          </section>

          <TwoFactorPanel
            state={twoFactor}
            offer={enrolmentOffer}
            recoveryCodes={recoveryCodes}
            error={sp.status === "error" ? (sp.message ?? null) : null}
            actions={{
              start: startTwoFactorEnrolment,
              confirm: confirmTwoFactorEnrolment,
              turnOff: turnOffTwoFactor,
              dismissCodes: dismissRecoveryCodes,
              issueNewCodes: issueNewRecoveryCodes,
            }}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[#2691F0]" />
              <div>
                <h2 className="font-outfit font-black text-[#041635]">Change password</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  You will need your current password. Minimum eight characters.
                </p>
              </div>
            </div>

            <form action={changeAdminPassword} className="mt-6 space-y-4">
              <input type="hidden" name="returnTo" value="/admin/profile" />

              <div>
                <label htmlFor="currentPassword" className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Current password
                </label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  required
                  autoComplete="current-password"
                  placeholder="Your current password"
                  className="mt-2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="newPassword" className="text-xs font-black uppercase tracking-wider text-slate-500">
                    New password
                  </label>
                  <PasswordInput
                    id="newPassword"
                    name="newPassword"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Confirm new password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repeat the new password"
                    className="mt-2"
                  />
                </div>
              </div>

              <Button type="submit" variant="premium" className="h-auto px-5 py-2.5 text-sm">
                <KeyRound className="h-4 w-4" />
                Change password
              </Button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#2691F0]" />
              <h2 className="font-outfit font-black text-[#041635]">Access</h2>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-500">Role</dt>
                <dd className="font-black text-[#041635]">{readableRole(admin.role)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-500">Two-factor</dt>
                <dd className="font-black text-[#041635]">
                  {twoFactor.enrolled ? "Enrolled" : "Not enrolled"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold text-slate-500">Email verified</dt>
                <dd className="font-black text-[#041635]">{record?.emailVerified ? "Yes" : "No"}</dd>
              </div>
              {!record?.emailVerified && (
                <div className="border-t border-slate-100 pt-3">
                  {/* Recovery and security notices are only worth anything if
                      the mailbox is known to belong to the account holder. */}
                  <p className="text-xs font-medium leading-relaxed text-slate-500">
                    Confirming your address means password recovery and security notices reach a mailbox
                    we know is yours.
                  </p>
                  <form action={requestEmailVerification} className="mt-3">
                    <button
                      type="submit"
                      className="rounded-lg border border-[#2691F0]/30 bg-[#2691F0]/5 px-3 py-1.5 text-xs font-black text-[#0f5aab] transition-colors hover:bg-[#2691F0] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
                    >
                      Send me a confirmation link
                    </button>
                  </form>
                </div>
              )}
              {record?.createdAt && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-slate-500">Account created</dt>
                  <dd className="font-black text-[#041635]">
                    {record.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-outfit font-black text-[#041635]">Your recent activity</h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              The last few actions recorded against your account.
            </p>

            {recentActivity.length === 0 ? (
              <p className="mt-5 text-sm font-semibold text-slate-500">Nothing recorded yet.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-slate-100 pl-3">
                    <p className="text-xs font-black text-[#041635]">{entry.action.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {entry.entityType} &middot;{" "}
                      {entry.createdAt.toLocaleString("en-GB", { timeZone: "UTC" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
