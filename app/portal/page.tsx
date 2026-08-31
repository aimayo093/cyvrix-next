import type { Metadata } from "next";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { connection } from "next/server";
import Link from "next/link";
import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VerifyEmailNotice } from "@/components/portal/VerifyEmailNotice";
import { getPortalStats } from "@/lib/data-fetchers";
import { submitPortalTestimonial } from "@/lib/portal-actions";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your CYVRIX services overview.",
};


type PortalSearchParams = {
  status?: string;
  message?: string;
};

type PortalOverviewProps = {
  searchParams: Promise<PortalSearchParams>;
};

export default function PortalOverview(props: PortalOverviewProps) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <PortalOverviewContent {...props} />
    </React.Suspense>
  );
}

async function PortalOverviewContent({ searchParams }: PortalOverviewProps) {
  await connection();
  const session = await requireUser();
  const sp = await searchParams;
  const stats = await getPortalStats(session.clientCompanyId || undefined);
  // Read fresh rather than from the session, which is minted at sign-in and
  // would keep claiming the address is unverified for the rest of the session
  // after the link is opened.
  const account = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, emailVerified: true },
  });
  const feedbackStatus = sp.status === "success" || sp.status === "error" ? sp.status : null;

  const recordsSummary = stats
    ? `${stats.activeTickets} open support ticket${stats.activeTickets === 1 ? "" : "s"} and ${stats.storedDocuments} shared document${stats.storedDocuments === 1 ? "" : "s"} are associated with your organisation.`
    : "Organisation records are not available for this account yet.";

  return (
    <div className="space-y-8 pb-12">
      {account && !account.emailVerified && <VerifyEmailNotice email={account.email} />}

      {feedbackStatus && (
        <div
          className={`relative z-10 flex items-start gap-3 rounded-3xl border p-4 ${
            feedbackStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedbackStatus === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div>
            <h4 className="font-outfit text-sm font-black uppercase tracking-wide">
              {feedbackStatus === "success" ? "Feedback received" : "Unable to submit feedback"}
            </h4>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed">
              {sp.message || "Please try again or contact CYVRIX support."}
            </p>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#041635] to-[#0a2a5e] p-8 text-white sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#7cc6ff]">Client workspace</p>
          <h1 className="mb-4 font-outfit text-4xl font-black">
            {session.name ? `Welcome, ${session.name.split(" ")[0]}.` : "Welcome to CYVRIX."}
          </h1>
          <p className="mb-3 text-lg font-medium leading-relaxed text-slate-200">
            Follow support requests and access documents shared with your organisation.
          </p>
          <p className="mb-8 text-sm font-semibold leading-relaxed text-slate-300">{recordsSummary}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/portal/support-tickets"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#041635] transition-colors hover:bg-slate-100"
            >
              Support tickets
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/portal/documents"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-white/10"
            >
              Shared documents
              <FileText className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#2691F0] opacity-20 blur-[100px]" />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2691F0]">Account records</p>
                <h2 className="mt-1 font-outfit text-xl font-black text-[#041635]">Your workspace at a glance</h2>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Counts reflect the ticket and document records currently available to this account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/portal/support-tickets"
                className="group rounded-2xl border border-slate-200 p-5 transition-colors hover:border-[#2691F0]/40 hover:bg-blue-50/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2691F0]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Open support tickets</p>
                <p className="mt-1 font-outfit text-3xl font-black text-[#041635]">{stats?.activeTickets ?? "—"}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-[#2691F0]">
                  View tickets <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                href="/portal/documents"
                className="group rounded-2xl border border-slate-200 p-5 transition-colors hover:border-[#2691F0]/40 hover:bg-blue-50/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2691F0]">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Shared documents</p>
                <p className="mt-1 font-outfit text-3xl font-black text-[#041635]">{stats?.storedDocuments ?? "—"}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-[#2691F0]">
                  Open documents <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Service reporting</p>
            <h2 className="mt-1 font-outfit text-xl font-black text-[#041635]">Verified information only</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
              Availability, security posture, renewals, and subscription status are shown here only when a verified service record or monitoring integration is connected. Contact CYVRIX if you need an update on any of these areas.
            </p>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2691F0]">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h2 className="font-outfit text-lg font-black text-[#041635]">Need support?</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              Open a support ticket and the CYVRIX team can review your request.
            </p>
            <Link
              href="/portal/support-tickets"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#041635] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#2691F0]"
            >
              Open support tickets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-outfit text-sm font-black text-[#041635]">Share your experience</h2>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Submitted feedback is reviewed before any public use.</p>
              </div>
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-500">
              Your feedback stays private until CYVRIX completes verification, evidence, and permission checks.
            </p>
            <form action={submitPortalTestimonial} className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Rating
                <select name="rating" required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]">
                  <option value="5">Excellent (5 stars)</option>
                  <option value="4">Good (4 stars)</option>
                  <option value="3">Neutral (3 stars)</option>
                </select>
              </label>

              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Your feedback
                <textarea
                  name="quote"
                  required
                  rows={4}
                  placeholder="Tell us about your experience with CYVRIX."
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0]"
                />
              </label>

              <Button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#041635] py-2.5 text-xs font-bold text-white hover:bg-[#2691F0]">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Submit for review
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
