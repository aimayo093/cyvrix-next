"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  User, 
  Lock,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { createPortalTicket, replyPortalTicket, acceptPortalProposal, updatePortalProfile } from "@/lib/portal-actions";

// Generic Submit Button with Loading State
function SubmitButton({ label, loadingLabel = "Processing..." }: { label: string; loadingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#2691F0] hover:bg-[#1a7fd9] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md shadow-blue-500/10 cursor-pointer"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

// 1. Profile Update Form
export function ProfileUpdateForm({ initialName }: { initialName: string }) {
  const [state, formAction] = useFormState(updatePortalProfile, null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state?.success) {
      setSuccessMsg(state.message);
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-black text-[#041635] uppercase tracking-wider block">Full Name</label>
        <div className="relative">
          <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            name="name"
            defaultValue={initialName}
            required
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm"
            placeholder="John Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-[#041635] uppercase tracking-wider block">Change Password (Optional)</label>
        <div className="relative">
          <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="password"
            name="password"
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm"
            placeholder="Leave blank to keep current"
          />
        </div>
        <p className="text-[10px] font-bold text-slate-400">Must be at least 8 characters long if provided.</p>
      </div>

      {state && !state.success && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-xs font-bold border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-3 text-xs font-bold border border-emerald-100">
          <CheckCircle2 className="h-5 w-5 shrink-0 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      <SubmitButton label="Update Profile Details" loadingLabel="Saving changes..." />
    </form>
  );
}

// 2. Proposal Approval Button
export function ProposalApprovalButton({ proposalId, isAccepted }: { proposalId: string; isAccepted: boolean }) {
  const [loading, setLoading] = React.useState(false);
  const [accepted, setAccepted] = React.useState(isAccepted);
  const [error, setError] = React.useState<string | null>(null);

  const handleApprove = async () => {
    if (accepted || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await acceptPortalProposal(proposalId);
      if (res.success) {
        setAccepted(true);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve proposal.");
    } finally {
      setLoading(false);
    }
  };

  if (accepted) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-xs font-black uppercase tracking-wider">
        <CheckCircle2 className="h-4 w-4" />
        Approved & SLA Active
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="px-6 py-2.5 bg-[#2691F0] hover:bg-[#1a7fd9] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Approving...</span>
          </>
        ) : (
          <span>Approve & Authorise Project</span>
        )}
      </button>
      {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
    </div>
  );
}

// 3. Create Ticket Form
export function PortalTicketForm() {
  const [state, formAction] = useFormState(createPortalTicket, null);
  const [success, setSuccess] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.success) {
      setSuccess(true);
      formRef.current?.reset();
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="font-outfit text-xl font-black text-[#041635] mb-2 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#2691F0]" />
        Open Support Ticket
      </h3>
      <p className="text-slate-400 text-xs font-medium">Submit a query to our 24/7 UK Service Operations Center. Most queries are resolved in under 2 hours.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-black text-[#041635] uppercase tracking-wider block">Category</label>
          <select
            name="category"
            required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm appearance-none"
          >
            <option value="IT Helpdesk & Troubleshooting">IT Helpdesk & Troubleshooting</option>
            <option value="Cybersecurity Incident">Cybersecurity Incident</option>
            <option value="Cloud Tenant Configuration">Cloud Tenant Configuration</option>
            <option value="Network & VPN Issues">Network & VPN Issues</option>
            <option value="Backup & Data Recovery">Backup & Data Recovery</option>
            <option value="Hardware Triage & Field Support">Hardware Triage & Field Support</option>
            <option value="Billing & Account Query">Billing & Account Query</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-[#041635] uppercase tracking-wider block">Priority</label>
          <select
            name="priority"
            required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm appearance-none"
          >
            <option value="LOW">Low (Business convenience)</option>
            <option value="NORMAL">Normal (Standard resolution)</option>
            <option value="HIGH">High (System partial failure)</option>
            <option value="CRITICAL">Critical (Total operations halt - 24/7 SLA)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-[#041635] uppercase tracking-wider block">Subject</label>
        <input
          type="text"
          name="subject"
          required
          maxLength={150}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm"
          placeholder="Brief summary of the issue..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-[#041635] uppercase tracking-wider block">Detailed Description</label>
        <textarea
          name="description"
          required
          rows={5}
          maxLength={4000}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm resize-none"
          placeholder="Please describe what is happening, any error messages, and what steps you've already tried..."
        />
      </div>

      {state && !state.success && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-xs font-bold border border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-3 text-xs font-bold border border-emerald-100">
          <CheckCircle2 className="h-5 w-5 shrink-0 animate-bounce" />
          <span>{state?.message || "Ticket opened successfully!"}</span>
        </div>
      )}

      <SubmitButton label="Launch Urgent Support Request" loadingLabel="Submitting request..." />
    </form>
  );
}

// 4. Portal Ticket Chat / Replies Panel
export function PortalTicketChat({ 
  ticketId, 
  initialMessages 
}: { 
  ticketId: string; 
  initialMessages: { id: string; authorId: string | null; body: string; createdAt: Date; authorName: string }[] 
}) {
  const [state, formAction] = useFormState(replyPortalTicket, null);
  const [messages, setMessages] = React.useState(initialMessages);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      // Smoothly update local state or let server component fetch it. Since server component revalidates, we update state:
      const rawText = new FormData(formRef.current || undefined).get("message") as string;
      if (rawText) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            authorId: "current-user",
            authorName: "You",
            body: rawText,
            createdAt: new Date(),
          }
        ]);
      }
    }
  }, [state]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col h-[550px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#2691F0]" />
        <span className="font-outfit font-black text-[#041635]">Ticket Correspondence</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <MessageSquare className="h-8 w-8 opacity-50" />
            <p className="text-xs font-bold">No correspondence yet on this ticket.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.authorId !== null && msg.authorId !== "agent";
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <span className="text-[10px] font-bold text-slate-400 mb-1">{msg.authorName}</span>
                <div 
                  className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${
                    isMe 
                      ? "bg-[#2691F0] text-white rounded-tr-none" 
                      : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Box */}
      <form ref={formRef} action={formAction} className="p-4 border-t border-slate-100 bg-white flex items-center gap-3">
        <input type="hidden" name="ticketId" value={ticketId} />
        <input
          type="text"
          name="message"
          required
          autoComplete="off"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2691F0] focus:bg-white transition-all text-sm"
          placeholder="Write your message here..."
        />
        <button
          type="submit"
          className="w-11 h-11 rounded-xl bg-[#2691F0] hover:bg-[#1a7fd9] text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-md shadow-blue-500/10"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
