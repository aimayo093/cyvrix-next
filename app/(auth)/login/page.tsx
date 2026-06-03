"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { login } from "./actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const next = searchParams.get("next");
  const message = searchParams.get("message");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result.success && result.destination) {
      router.push(next || result.destination);
    }
  }

  return (
    <div className="min-h-screen bg-[#041635] flex items-center justify-center p-5 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-[#2691F0] rounded-full blur-[150px] opacity-10 animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-[#2691F0] rounded-full blur-[150px] opacity-10 animate-pulse delay-700" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Back to website</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2691F0] to-[#041635] mb-6 shadow-lg shadow-blue-500/20">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-outfit text-3xl font-black text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400 font-medium">Access your CYVRIX control panel</p>
          </div>

          {message && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {message}
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input 
                  type="email" 
                  name="email"
                  required
                  placeholder="name@company.co.uk"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                <Link href="/forgot-password" title="Coming soon" className="text-[10px] font-black text-[#2691F0] hover:underline uppercase tracking-wider">
                  Forgot?
                </Link>
              </div>
              <PasswordInput 
                name="password"
                required
                hasLeftIcon
                placeholder="••••••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#2691F0] focus:border-transparent outline-none py-3.5"
              />
            </div>

            <Button 
              type="submit" 
              variant="premium" 
              className="w-full py-6 rounded-xl text-lg font-black shadow-xl shadow-blue-500/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center mt-10 text-sm font-bold text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/contact" className="text-[#2691F0] hover:underline">Contact Support</Link>
          </p>
        </motion.div>

        <p className="text-center mt-8 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} CYVRIX Technologies Ltd &bull; Secure Systems
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#041635] flex items-center justify-center p-5 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-[#2691F0] rounded-full blur-[150px] opacity-10 animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-[#2691F0] rounded-full blur-[150px] opacity-10 animate-pulse delay-700" />
        <div className="text-center text-slate-400 font-medium z-10 animate-pulse">Loading control panel...</div>
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}
