import * as React from "react";
import { Calendar, ShieldCheck, CheckCircle2, Clock, MapPin, Send, HelpCircle } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { submitContact } from "@/lib/actions";

export const metadata = {
  title: "Book a Free Consultation | CYVRIX Technologies",
  description: "Schedule a secure, professional technical consultation with CYVRIX. Discuss IT support, cybersecurity readiness, cloud migration, and infrastructure compliance.",
};

export default function BookConsultationPage() {
  const benefits = [
    {
      title: "Complimentary & Zero Obligation",
      description: "A 30-minute discovery call with a senior consultant to understand your technical challenges.",
    },
    {
      title: "Tailored Security Roadmap",
      description: "Receive practical recommendations to improve your security posture and resolve compliance gaps.",
    },
    {
      title: "No Outsourced Aggression",
      description: "Direct contact with UK engineers who understand operations, not aggressive sales agents.",
    },
  ];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden bg-[#041635] text-white pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-[#041635]/90 to-[#041635]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2691F0] text-xs font-black tracking-widest uppercase mb-6 animate-pulse">
            <Calendar className="h-3.5 w-3.5" />
            Direct Calendar Booking
          </span>
          <h1 className="font-outfit text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6">
            Book a Technical <span className="text-[#2691F0]">Consultation</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-300 font-medium text-lg md:text-xl leading-relaxed">
            Discuss your IT infrastructure, cloud governance, and security posture with an experienced UK technology strategist.
          </p>
        </div>
      </section>

      {/* Main Split Content */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Authority & Trust */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <h2 className="font-outfit text-3xl font-black text-[#041635]">
                What to expect during our session
              </h2>
              <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
                We believe in providing immediate, practical technical value. Our consultations are designed to address real operations without pressure.
              </p>
            </div>

            <div className="space-y-6 pt-4">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#2691F0] shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-black text-base text-[#041635] mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 pt-6">
              <h4 className="font-outfit font-black text-sm text-[#041635] uppercase tracking-wider">
                Consultation Details
              </h4>
              <div className="space-y-3 text-sm font-semibold text-slate-600">
                <p className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[#2691F0]" />
                  30 Minutes Discovery Session
                </p>
                <p className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[#2691F0]" />
                  Microsoft Teams Video Call
                </p>
                <p className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-[#2691F0]" />
                  Strictly Confidential (NDA Ready)
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Booking Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm relative overflow-hidden">
            <h3 className="font-outfit text-2xl font-black text-[#041635] mb-2">
              Select details & schedule
            </h3>
            <p className="text-slate-400 font-bold text-sm mb-8">
              Fill out the fields below and our operations coordinator will confirm your Teams slot.
            </p>

            <form action={submitContact} className="space-y-6">
              {/* Invisible hidden trigger so the lead is classified correctly */}
              <input type="hidden" name="preferredContact" value="teams_consultation" />
              <input type="hidden" name="businessType" value="consultation_form" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block text-sm font-bold text-slate-700">
                  Your Name
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. David Thompson"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Email Address
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. david@innovate.co.uk"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Company Name
                  <input
                    name="company"
                    type="text"
                    placeholder="e.g. Innovate UK Ltd"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Primary Interest
                  <select
                    name="service"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  >
                    <option value="Managed IT support">Managed IT support</option>
                    <option value="Cybersecurity and hardening">Cybersecurity & CE hardening</option>
                    <option value="Cloud migration and setup">Cloud migration & M365/Google</option>
                    <option value="Infrastructure audit and planning">Infrastructure audit</option>
                    <option value="Compliance and risk consultancy">Compliance & risk advisory</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block text-sm font-bold text-slate-700">
                  Urgency State
                  <select
                    name="urgency"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  >
                    <option value="Standard planning">Standard Planning (Within 30 days)</option>
                    <option value="Active migration or change">Active Change (Within 14 days)</option>
                    <option value="Critical issue / breach readiness">Critical Security Audit (Immediate)</option>
                  </select>
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Preferred Call Time
                  <select
                    name="message_prefix"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold"
                  >
                    <option value="Morning (09:00 - 12:00)">Morning (09:00 - 12:00)</option>
                    <option value="Afternoon (12:00 - 15:00)">Afternoon (12:00 - 15:00)</option>
                    <option value="Late Afternoon (15:00 - 17:00)">Late Afternoon (15:00 - 17:00)</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-bold text-slate-700">
                Briefly describe your objectives or system landscape:
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="e.g. We have 25 remote users on M365 and need to align with Cyber Essentials standard..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#041635] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2691F0] focus:border-transparent transition-all font-semibold resize-none"
                />
              </label>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-[#2691F0] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  By submitting this request, you consent to CYVRIX processing your data to schedule the requested video call. No sales lists, spam, or outbound cold calling.
                </p>
              </div>

              <Button type="submit" variant="default" className="w-full bg-[#2691F0] text-white hover:bg-[#041635] py-4 rounded-xl flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                Confirm Consultation Request
              </Button>
            </form>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl pointer-events-none opacity-40" />
          </div>

        </div>
      </section>
    </div>
  );
}
