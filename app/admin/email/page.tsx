import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { sendAdminEmail } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { Mail, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Email Broadcasts | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function EmailBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  async function handleSendEmail(formData: FormData) {
    "use server";
    try {
      await sendAdminEmail(formData);
      redirect("/admin/email?status=success&message=Email sent successfully");
    } catch (err: any) {
      const msg = encodeURIComponent(err.message || "Failed to send email");
      redirect(`/admin/email?status=error&message=${msg}`);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {sp.status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          sp.status === "success" 
            ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
            : "bg-rose-50 border-rose-250 text-rose-800"
        }`}>
          {sp.status === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-outfit font-black text-sm uppercase tracking-wide">
              {sp.status === "success" ? "Message Dispatched" : "Delivery Error"}
            </h4>
            <p className="text-xs font-semibold mt-0.5 leading-relaxed">{sp.message}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]">Email Broadcasts</h1>
        <p className="text-slate-500 text-sm mt-1">Send manual communications directly from the platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Mail className="h-4 w-4 text-[#2691F0]" />
          <h2 className="font-outfit font-black text-[#041635]">Compose Email</h2>
        </div>
        <form action={handleSendEmail} className="p-6 space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Recipient Email (To)
            <input 
              name="to" 
              type="email"
              required
              placeholder="client@company.com" 
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" 
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Subject Line
            <input 
              name="subject" 
              required
              placeholder="Important Update regarding your Service" 
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" 
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Message Body (Plain Text)
            <textarea 
              name="body" 
              required
              rows={8}
              placeholder="Dear Client,&#10;&#10;We are writing to inform you..." 
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none font-mono" 
            />
          </label>

          <p className="text-[10px] text-slate-400 font-semibold mb-4">
            Emails are securely dispatched via the SMTP configuration defined in System Settings.
          </p>

          <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
            <Send className="h-4 w-4" /> Send Email
          </Button>
        </form>
      </div>
    </div>
  );
}
