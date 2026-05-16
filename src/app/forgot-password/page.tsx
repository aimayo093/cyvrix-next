import Link from "next/link";
import { requestPasswordReset } from "@/app/login/actions";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <form action={requestPasswordReset} className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">CYVRIX authentication</p>
        <h1 className="mt-3 font-outfit text-3xl font-black">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Enter your account email and CYVRIX will send a secure reset link when email is configured.</p>
        <input name="email" type="email" required placeholder="you@company.co.uk" className="mt-6 w-full rounded-md border border-white/10 bg-slate-950 px-4 py-3" />
        <button className="mt-4 w-full rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Send reset link</button>
        <Link href="/login" className="mt-5 block text-center text-sm font-bold text-cyan-300">Back to login</Link>
      </form>
    </main>
  );
}
