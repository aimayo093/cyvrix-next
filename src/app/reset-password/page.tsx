import { updatePassword } from "@/app/login/actions";

export const metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <form action={updatePassword} className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">CYVRIX authentication</p>
        <h1 className="mt-3 font-outfit text-3xl font-black">Set a new password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Use a strong password. Session cookies are handled by the CYVRIX secure cookie session layer.</p>
        <input name="email" type="email" required placeholder="Account email" className="mt-6 w-full rounded-md border border-white/10 bg-slate-950 px-4 py-3" />
        <input name="password" type="password" required minLength={12} placeholder="New password" className="mt-4 w-full rounded-md border border-white/10 bg-slate-950 px-4 py-3" />
        <button className="mt-4 w-full rounded-md bg-cyan-400 px-5 py-3 font-black text-slate-950">Update password</button>
      </form>
    </main>
  );
}
