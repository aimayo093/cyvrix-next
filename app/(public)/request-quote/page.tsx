import * as React from "react";
import { Metadata } from "next";
import { ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { submitQuote } from "@/lib/actions";
import { industries, services } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Request a Quote | CYVRIX Technologies",
  description: "Request a custom technical proposal and scoped IT support or cybersecurity quotation from CYVRIX.",
};

export default function RequestQuotePage() {
  return (
    <div className="pt-24 pb-32 bg-[#020817] text-white">
      <div className="max-w-4xl mx-auto px-5">
        
        {/* Header Block */}
        <div className="text-center mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-[#2691F0] bg-[#2691F0]/100/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
            Formal Quotation
          </span>
          <h1 className="font-outfit text-4xl md:text-5.5xl font-black text-white mt-6 mb-6 leading-tight tracking-tight">
            Scope a custom <span className="text-[#2691F0]">technical review.</span>
          </h1>
          <p className="text-md text-slate-400 leading-relaxed font-medium max-w-2xl mx-auto">
            Give us brief details about your endpoints, core operational challenges, and preferred timeline. We will deliver a clear, structured technical scope.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#041635]/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl shadow-blue-500/5">
          <form action={submitQuote} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field name="businessName" label="Registered Company Name" required placeholder="Innovate UK Ltd" />
              <Field name="contactName" label="Primary Contact Name" required placeholder="Alice Smith" />
              <Field name="email" label="Professional Email Address" type="email" required placeholder="alice@company.co.uk" />
              <Field name="phone" label="Contact Telephone" placeholder="020 7946 0958" />
              
              <Select 
                name="companySize" 
                label="Total Active Endpoints / Staff" 
                options={["1-10", "11-50", "51-200", "201-500", "500+"]} 
                required 
              />
              <Select 
                name="industry" 
                label="Sector / Industry Group" 
                options={["Select Sector", ...industries.map(i => i.title)]} 
                required 
              />
              <Select 
                name="service" 
                label="Primary Service Requirement" 
                options={["Select Service", ...services.map(s => s.title)]} 
                required 
              />
              <Select 
                name="urgency" 
                label="Project Urgency" 
                options={["Planning / Strategy Stage", "Within 30 Days", "Urgent / Hard Target", "Emergency Audit"]} 
                required 
              />
              
              <Select 
                name="budget" 
                label="Projected Annual Budget (Optional)" 
                options={["To be discussed", "Under £2,500", "£2,500 - £10,000", "£10,000 - £50,000", "£50,000+"]} 
              />
              <Field name="preferredTime" label="Preferred Meeting Slot" placeholder="e.g. Tuesdays at 10 AM" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-white uppercase tracking-widest">
                Primary technical or continuity challenges
              </label>
              <textarea 
                name="challenge" 
                required 
                rows={5} 
                placeholder="Detail what technical limitations, outages, slow response times, or compliance deadlines you're trying to solve..."
                className="w-full rounded-2xl border border-white/10 bg-[#020817] p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-[#2691F0] focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-semibold resize-none"
              />
            </div>

            <div className="p-4 bg-[#041635]/50 rounded-2xl border border-white/5 flex gap-3 items-start text-xs text-slate-400">
              <Info className="h-4.5 w-4.5 text-[#2691F0] shrink-0 mt-0.5" />
              <p>
                By submitting this proposal draft, you authorize CYVRIX Technologies to create a secure Lead profile in our CRM, queue custom notifications, and follow up regarding scoped parameters.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-6">
              <label className="flex items-start gap-3 text-xs font-semibold text-slate-400 cursor-pointer">
                <input name="consent" type="checkbox" required className="mt-0.5 accent-[#2691F0]" />
                <span>I consent to CYVRIX Technologies processing this request in accordance with the Privacy Policy.</span>
              </label>
              
              <Button 
                type="submit" 
                variant="premium" 
                className="w-full bg-[#2691F0] text-white hover:bg-blue-600 border-none shadow-lg shadow-blue-500/20 py-3.5 mt-2"
              >
                Submit Proposal Parameters
              </Button>
            </div>
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
      <label className="text-xs font-black text-white uppercase tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        name={name} 
        type={type} 
        required={required} 
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#2691F0] focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-semibold"
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
      <label className="text-xs font-black text-white uppercase tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select 
        name={name} 
        required={required} 
        className="w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-sm text-white outline-none focus:border-[#2691F0] focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-semibold cursor-pointer"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#020817] text-white">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
