import * as React from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowRight, MessageSquare, Home } from "lucide-react";
import { Button } from "@/components/shared/Button";

interface ThankYouProps {
  searchParams: Promise<{
    type?: string;
    ticket?: string;
    status?: string;
    message?: string;
  }>;
}

export default async function ThankYouPage({ searchParams }: ThankYouProps) {
  const params = await searchParams;
  const isError = params.status === "error";
  const type = params.type || "general";
  const ticketRef = params.ticket;

  return (
    <div className="pt-32 pb-40 min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-[#020817] to-[#041635]">
      <div className="max-w-xl w-full mx-5 bg-[#020817] p-10 md:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-blue-500/5 text-center relative overflow-hidden">
        {/* Decorative subtle gradient spot */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#2691F0]/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          {isError ? (
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-8 border border-rose-100">
              <AlertTriangle className="h-8 w-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-8 border border-emerald-100 animate-bounce-short">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          )}

          <p className="text-xs font-black uppercase tracking-widest text-[#2691F0] mb-4">
            {isError ? "Action Required" : "Submission Received"}
          </p>

          <h1 className="font-outfit text-3.5xl font-black text-white tracking-tight leading-tight mb-6">
            {isError ? "Please Review Form" : "Operation Successful"}
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {isError 
              ? (params.message || "We could not process your submission. Please check your information and try again.")
              : `Thank you for contacting CYVRIX Technologies. Your ${type} request has been processed successfully, and our systems have scheduled the corresponding notifications.`
            }
          </p>

          {ticketRef && (
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Support Reference</p>
              <p className="font-mono text-lg font-black text-white tracking-wider">{ticketRef}</p>
              <p className="text-xs text-slate-500 mt-2">Please keep this reference for communication with our agents.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-4">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Home className="h-4 w-4" />
                Return Home
              </Button>
            </Link>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button variant="premium" className="w-full sm:w-auto gap-2 bg-[#041635] text-white hover:bg-slate-900 border-none">
                <MessageSquare className="h-4 w-4" />
                Contact CYVRIX
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
