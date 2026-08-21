import * as React from "react";
import { Suspense } from "react";
import { Calendar, ShieldCheck, CheckCircle2, Clock, MapPin, Send, HelpCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { submitContact } from "@/lib/actions";
import { BookingServiceSelect } from "./BookingServiceSelect";

export const metadata = {
  title: "Book a Technology Review",
  description: "Start a practical conversation about managed services, cloud and cybersecurity, field engineering or a professional technology project.",
};

export default function BookConsultationPage() {
  const benefits = [
    {
      title: "Focused discovery",
      description: "A practical first conversation to understand the technology, people and outcomes involved.",
    },
    {
      title: "Useful next steps",
      description: "We will help identify the most appropriate service route, project shape or initial assessment.",
    },
    {
      title: "A considered commercial fit",
      description: "The discussion is designed to clarify scope and working approach before any proposal is prepared.",
    },
  ];

  return (
    <div className="bg-[#020817] min-h-screen">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-[#041635] text-white pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#041635]/90 to-[#041635]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#2691F0]/100/10 border border-[#2691F0]/20 text-[#2691F0] text-xs font-black tracking-widest uppercase mb-6 animate-pulse">
            <Calendar className="h-3.5 w-3.5" />
            Start a conversation
          </span>
          <h1 className="font-outfit text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            Book a Technology <span className="text-[#2691F0]">Review</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-300 font-medium text-lg md:text-xl leading-relaxed">
            Start a practical conversation about managed services, cloud and cybersecurity, field engineering or professional technology work.
          </p>
        </div>
      </section>

      {/* Main Split Content */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Authority & Trust */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <h2 className="font-outfit text-3xl font-black text-white">
                What to expect during our session
              </h2>
              <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
                We use the first conversation to understand the work in front of you and determine the right next step.
              </p>
            </div>

            <div className="space-y-6 pt-4">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="p-2 rounded-xl bg-[#2691F0]/10 text-[#2691F0] shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-black text-base text-white mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#020817] p-6 rounded-2xl border border-white/10 shadow-sm space-y-4 pt-6">
              <h4 className="font-outfit font-black text-sm text-white uppercase tracking-wider">
                Consultation Details
              </h4>
              <div className="space-y-3 text-sm font-semibold text-slate-400">
                <p className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[#2691F0]" />
                  Discovery format agreed with you
                </p>
                <p className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#2691F0]" />
                  Remote or on-site discussion, as appropriate
                </p>
                <p className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-[#2691F0]" />
                  Sensitive information can be scoped before it is shared
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Booking Form */}
          <div className="lg:col-span-7 bg-[#020817] rounded-3xl border border-white/10 p-8 sm:p-12 shadow-sm relative overflow-hidden">
            <h3 className="font-outfit text-2xl font-black text-white mb-2">
              Tell us about the work
            </h3>
            <p className="text-slate-400 font-bold text-sm mb-8">
              Share the essentials and we will use them to prepare an appropriate response.
            </p>

            <form action={submitContact} className="space-y-6">
              {/* Invisible hidden trigger so the lead is classified correctly */}
              <input type="hidden" name="preferredContact" value="video_call" />
              <input type="hidden" name="businessType" value="consultation_form" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block text-sm font-bold text-slate-300">
                  Your Name
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. David Thompson"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-300">
                  Email Address
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. david@innovate.co.uk"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-300">
                  Company Name
                  <input
                    name="company"
                    type="text"
                    placeholder="e.g. Innovate UK Ltd"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-300">
                  Primary Interest
                  <Suspense fallback={<ServiceSelectFallback />}>
                    <BookingServiceSelect />
                  </Suspense>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block text-sm font-bold text-slate-300">
                  Urgency State
                  <select
                    name="urgency"
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  >
                    <option value="Standard planning" className="bg-[#020817] text-white">Standard Planning (Within 30 days)</option>
                    <option value="Active migration or change" className="bg-[#020817] text-white">Active Change (Within 14 days)</option>
                    <option value="Critical issue / breach readiness" className="bg-[#020817] text-white">Critical Security Audit (Immediate)</option>
                  </select>
                </label>

                <label className="block text-sm font-bold text-slate-300">
                  Preferred Call Time
                  <select
                    name="preferredTime"
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  >
                    <option value="Morning (09:00 - 12:00)" className="bg-[#020817] text-white">Morning (09:00 - 12:00)</option>
                    <option value="Afternoon (12:00 - 15:00)" className="bg-[#020817] text-white">Afternoon (12:00 - 15:00)</option>
                    <option value="Late Afternoon (15:00 - 17:00)" className="bg-[#020817] text-white">Late Afternoon (15:00 - 17:00)</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-bold text-slate-300">
                Briefly describe your objectives or system landscape:
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="e.g. We have 25 remote users on M365 and need to align with Cyber Essentials standard..."
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold resize-none"
                />
              </label>

              <div className="bg-[#020817] p-4 rounded-xl border border-white/5 flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-[#2691F0] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  We only need the context required to respond to this request. Please do not include passwords, access tokens or sensitive configuration data.
                </p>
              </div>

              <label className="flex items-start gap-3 text-xs font-semibold leading-6 text-slate-400">
                <input name="consent" type="checkbox" required className="mt-1 accent-[#2691F0]" />
                <span>I consent to CYVRIX processing this technology review request in line with the <a href="/privacy-policy" className="text-sky-300 underline underline-offset-2 hover:text-white">Privacy Policy</a>.</span>
              </label>

              <Button type="submit" variant="default" className="w-full bg-[#2691F0] text-white hover:bg-[#041635] py-4 rounded-xl flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                Send technology review request
              </Button>
            </form>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#2691F0]/10 rounded-full blur-3xl pointer-events-none opacity-40" />
          </div>

        </div>
      </section>
    </div>
  );
}

function ServiceSelectFallback() {
  return (
    <select
      name="service"
      required
      defaultValue="General Technology Review"
      className="mt-2 w-full rounded-xl border border-white/10 bg-[#020817] px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2691F0] transition-all font-semibold"
    >
      <option value="General Technology Review">General Technology Review</option>
      <option value="Managed Services">Managed Services</option>
      <option value="Cloud & Cybersecurity">Cloud &amp; Cybersecurity</option>
      <option value="Cloud Services">Cloud Services</option>
      <option value="Cybersecurity">Cybersecurity</option>
      <option value="Infrastructure">Infrastructure</option>
      <option value="Field Engineering">Field Engineering</option>
      <option value="Professional Services">Professional Services</option>
    </select>
  );
}
