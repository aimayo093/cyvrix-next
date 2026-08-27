import * as React from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/lib/email-verification";

export const metadata = { title: "Confirm your email address" };

type VerifyPageProps = { searchParams: Promise<{ token?: string }> };

export default function VerifyEmailPage(props: VerifyPageProps) {
  return (
    <React.Suspense fallback={<Shell title="Checking your link&hellip;" body="One moment." ok={null} />}>
      <VerifyEmailContent {...props} />
    </React.Suspense>
  );
}

async function VerifyEmailContent({ searchParams }: VerifyPageProps) {
  await connection();
  const { token } = await searchParams;

  if (!token) {
    return <Shell ok={false} title="That link is incomplete." body="Open the link from the email exactly as it was sent." />;
  }

  const result = await verifyEmailToken(token);

  if (result.ok) {
    return (
      <Shell
        ok
        title="Email address confirmed."
        body={`${result.email} is now verified. Password recovery and security notices will reach this mailbox.`}
      />
    );
  }

  const body =
    result.reason === "expired"
      ? "That link has expired. Request a new one from your profile and open it within 24 hours."
      : result.reason === "email_changed"
        ? "The address on this account changed after the link was sent, so it no longer applies. Request a new one."
        : "That link is not valid. It may already have been used, or a newer one was sent.";

  return <Shell ok={false} title="This link could not be used." body={body} />;
}

function Shell({ ok, title, body }: { ok: boolean | null; title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020817] px-5 py-24">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#071126] p-8 text-center md:p-10">
        {ok === true && <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />}
        {ok === false && <XCircle className="mx-auto h-10 w-10 text-rose-400" />}
        <h1 className="mt-6 font-outfit text-2xl font-black text-white md:text-3xl">{title}</h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-slate-300">{body}</p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#2691F0] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071126]"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
