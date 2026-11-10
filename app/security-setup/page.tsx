import * as React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { TwoFactorPanel } from "@/components/admin/TwoFactorPanel";
import { requireStaffForSecondFactorSetup } from "@/lib/auth";
import { getTwoFactorState, pendingEnrolmentOffer } from "@/lib/two-factor";

export const metadata = { title: "Set up two-factor authentication", robots: { index: false } };

type SetupPageProps = { searchParams: Promise<{ status?: string; message?: string }> };

/**
 * Staff accounts must have a second factor (DECISIONS §6). Until one is set
 * up, this is the only page a staff session can open: getSession reads the
 * account as signed out everywhere else, so the admin, its actions and its
 * API routes all refuse it.
 */
export default function SecuritySetupPage(props: SetupPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <React.Suspense fallback={<PrivateRouteFallback />}>
          <SetupContent {...props} />
        </React.Suspense>
      </div>
    </div>
  );
}

async function SetupContent({ searchParams }: SetupPageProps) {
  await connection();
  const staff = await requireStaffForSecondFactorSetup();
  if (!staff.needsSecondFactor) redirect("/admin");

  const sp = await searchParams;
  const state = await getTwoFactorState(staff.id);
  // The pending secret is reused, so a refresh does not replace a scanned QR code.
  const offer = await pendingEnrolmentOffer(staff.id, staff.email);

  return (
    <>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-[#2691F0]" aria-hidden="true" />
        <div>
          <h1 className="font-outfit text-2xl font-black text-[#041635]">Set up two-factor authentication</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
            Every staff account needs a second factor before it can open the admin. It takes about a
            minute: scan the code with an authenticator app, then enter the six digits it shows.
          </p>
        </div>
      </div>

      <TwoFactorPanel
        state={state}
        offer={offer}
        recoveryCodes={null}
        error={sp.status === "error" ? (sp.message ?? null) : null}
      />

      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-sm font-bold text-slate-500 underline-offset-4 hover:text-[#041635] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0]"
        >
          Sign out instead
        </button>
      </form>
    </>
  );
}
