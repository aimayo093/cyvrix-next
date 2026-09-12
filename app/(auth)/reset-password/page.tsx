import type { Metadata } from "next";
import * as React from "react";
import { connection } from "next/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new CYVRIX account password using a secure reset link.",
  robots: { index: false, follow: false },
};

type ResetPasswordPageProps = { searchParams: Promise<{ token?: string }> };

/**
 * The token read has to sit inside a Suspense boundary.
 *
 * cacheComponents is on, so connection() and searchParams accessed directly in
 * the page body stop the route being prerendered at all, and the build fails
 * with "encountered uncached or runtime data during prerendering". Wrapping the
 * dynamic part lets the shell prerender and the token resolve per request,
 * which is the same shape /login and the admin pages already use.
 */
export default function ResetPasswordPage(props: ResetPasswordPageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="grid min-h-screen bg-[#041635] lg:grid-cols-[1fr_1.05fr]">
          <div className="flex items-center justify-center p-5">
            <div className="text-center font-medium text-slate-400">Loading…</div>
          </div>
          <div className="hidden bg-[#020817] lg:block" />
        </div>
      }
    >
      <ResetPasswordContent {...props} />
    </React.Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: ResetPasswordPageProps) {
  await connection();
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
