import * as React from "react";
import { Metadata } from "next";
import { HelpCircle, MessageSquare, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { submitTicket } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Support Desk & Ticket Submission | CYVRIX Technologies",
  description: "Raise an engineering support ticket or contact our 24/7 technical desk for urgent incident resolution.",
};

export default function SupportPage() {
  return (
    <div className="pt-24 pb-32 bg-slate-50 text-[#041635]">
      <div className="max-w-4xl mx-auto px-5">
        
        {/* Header Block */}
        <div className="text-center mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-[#2691F0] bg-blue-500/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
            Technical Operations
          </span>
          <h1 className="font-outfit text-4xl md:text-5.5xl font-black text-[#041635] mt-6 mb-6 leading-tight tracking-tight">
            Raise a support <span className="text-[#2691F0]">engineering ticket.</span>
          </h1>
          <p className="text-md text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto">
            Authorized client representatives can submit dynamic ticket parameters. Critical priority assignments trigger automated on-call engineer escalations in under 15 minutes.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-blue-500/5">
          <form action={submitTicket} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field name="name" label="Your Name" required placeholder="James Richardson" />
              <Field name="email" label="Work Email Address" type="email" required placeholder="james@innovate.co.uk" />
              <Field name="company" label="Company Name" required placeholder="Innovate UK" />
              
              <Select 
                name="priority" 
                label="Ticket Urgency Level" 
                options={["Normal", "Low", "High", "Critical (SLA P1 Event)"]} 
                required 
              />
              <Select 
                name="category" 
                label="Assigned Category" 
                options={["User Access / Identity", "Email & Collaboration", "Hardware & Endpoints", "Network & Connectivity", "Cybersecurity Event", "Cloud Platform / VM", "Backup & Restore", "Bespoke Request"]} 
                required 
              />
              <Select 
                name="existingClient" 
                label="Are you an SLA Client?" 
                options={["yes", "no"]} 
              />
            </div>

            <Field name="subject" label="Short Summary Subject" required placeholder="Unable to sync email endpoints or credentials" />

            <div className="space-y-2">
              <label className="text-xs font-black text-[#041635] uppercase tracking-widest">
                Detailed description of operational failure
              </label>
              <textarea 
                name="description" 
                required 
                rows={6} 
                placeholder="Include error codes, affected endpoints, software version parameters, and steps to reproduce..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm outline-none focus:border-[#2691F0] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[#041635] uppercase tracking-widest">
                File Attachment (Optional)
              </label>
              <input 
                name="attachment" 
                type="file" 
                className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-xs text-slate-400 focus:border-[#2691F0] transition-colors outline-none cursor-pointer"
              />
            </div>

            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3.5 items-start">
              <ShieldCheck className="h-5 w-5 text-[#2691F0] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500 leading-relaxed font-semibold">
                <p className="text-[#041635] font-black uppercase tracking-wider mb-1">Response Guarantees</p>
                Clients under dynamic SLA coverage agreements receive guaranteed on-call desk ingestion. Public or generic submissions will be reviewed within 4 business hours.
              </div>
            </div>

            <Button 
              type="submit" 
              variant="premium" 
              className="w-full bg-[#2691F0] text-white hover:bg-blue-600 border-none shadow-lg shadow-blue-500/20 py-3.5 mt-4"
            >
              Initialize Support Ticket
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}

function Field({ 
  name, 
  label, 
  type = "text", 
  required = false, 
  placeholder 
}: { 
  name: string; 
  label: string; 
  type?: string; 
  required?: boolean; 
  placeholder?: string; 
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-[#041635] uppercase tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        name={name} 
        type={type} 
        required={required} 
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-[#2691F0] transition-colors"
      />
    </div>
  );
}

function Select({ 
  name, 
  label, 
  options, 
  required = false 
}: { 
  name: string; 
  label: string; 
  options: string[]; 
  required?: boolean; 
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-[#041635] uppercase tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select 
        name={name} 
        required={required} 
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-[#2691F0] transition-colors"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
