import * as React from "react";
import { Metadata } from "next";
import { Mail, Phone, MapPin, Shield, Check } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { submitContact } from "@/lib/actions";
import { industries, services } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Contact Us | CYVRIX Technologies",
  description: "Speak to CYVRIX Technologies about IT support, cybersecurity audit plans, cloud configurations, or bespoke consultancy.",
};

export default function ContactPage() {
  return (
    <div className="pt-24 pb-32 bg-slate-50 text-[#041635]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-16 items-start">
          
          {/* Info Side */}
          <div className="space-y-10">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#2691F0] bg-blue-500/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
                UK Support Desk
              </span>
              <h1 className="font-outfit text-4.5xl md:text-5.5xl font-black text-[#041635] mt-6 mb-6 leading-tight tracking-tight">
                Connect with our <br />
                <span className="text-[#2691F0]">technical desk.</span>
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                Whether you need immediate emergency mitigation or a planned cybersecurity review sprint, our UK engineers are available. Send an enquiry or book a time directly.
              </p>
            </div>

            <div className="space-y-4">
              <ContactInfo 
                icon={Mail} 
                label="General Support Mailbox" 
                value="support@cyvrix.co.uk" 
              />
              <ContactInfo 
                icon={Phone} 
                label="Direct Operations Line" 
                value="Set in admin settings" 
              />
              <ContactInfo 
                icon={MapPin} 
                label="Registered Headquarters" 
                value="United Kingdom Service Coverage" 
              />
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex gap-4 items-start">
              <Shield className="h-6 w-6 text-[#2691F0] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-[#041635] uppercase tracking-widest mb-1">Encrypted Ingestion</p>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  All communications sent via this portal are protected using industry-standard TLS encryption protocols and stored securely in ISO-compliant Supabase systems.
                </p>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-blue-500/5">
            <h3 className="font-outfit text-2.5xl font-black mb-6 text-[#041635]">Submit an Enquiry</h3>
            
            <form action={submitContact} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field name="name" label="Name" required placeholder="John Doe" />
                <Field name="email" label="Email Address" type="email" required placeholder="john@company.co.uk" />
                <Field name="company" label="Company Name" placeholder="Innovate Ltd" />
                <Select 
                  name="businessType" 
                  label="Sector" 
                  options={["Select Sector", ...industries.map(i => i.title)]} 
                />
                <Select 
                  name="service" 
                  label="Service Interest" 
                  options={["Select Service", ...services.map(s => s.title)]} 
                  required 
                />
                <Select 
                  name="urgency" 
                  label="Response Urgency" 
                  options={["Planning Ahead", "Next 30 Days", "Immediate (Critical / Incident)"]} 
                />
                <Select 
                  name="preferredContact" 
                  label="Preferred Method" 
                  options={["Email Contact", "Direct Call", "Microsoft Teams Video Call"]} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-[#041635] uppercase tracking-widest">
                  Brief description of requirements
                </label>
                <textarea 
                  name="message" 
                  required 
                  rows={5} 
                  placeholder="Tell us what challenges you're facing or what you need improved..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm outline-none focus:border-[#2691F0] transition-colors"
                />
              </div>

              <Button 
                type="submit" 
                variant="premium" 
                className="w-full bg-[#2691F0] text-white hover:bg-blue-600 border-none shadow-lg shadow-blue-500/20 py-3.5"
              >
                Send Request
              </Button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}

function ContactInfo({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string; 
}) {
  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2691F0] flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="font-outfit font-black text-md text-[#041635] mt-0.5">{value}</p>
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
