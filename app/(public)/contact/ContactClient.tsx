"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Building,
  AlertCircle,
  Sparkles,
  Server,
  Lock,
  Headphones
} from "lucide-react";
import { publicContactValue } from "@/lib/contact-settings";

interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

interface ContactPageSection {
  sectionType?: string | null;
  subtitle?: string | null;
  title?: string | null;
  body?: string | null;
  mediaId?: string | null;
}

interface ContactPageData {
  sections?: ContactPageSection[];
  featuredImage?: string | null;
}

interface ContactClientProps {
  pageData?: ContactPageData | null;
  services: Service[];
  contactSettings?: Record<string, string>;
}

const fallbackServices: Service[] = [
  { id: "managed-services", slug: "managed-services", title: "Managed Services", summary: "" },
  { id: "cloud-services", slug: "cloud-services", title: "Cloud Services", summary: "" },
  { id: "cybersecurity", slug: "cybersecurity", title: "Cybersecurity", summary: "" },
  { id: "infrastructure", slug: "infrastructure", title: "Infrastructure", summary: "" },
  { id: "field-engineering", slug: "field-engineering", title: "Field Engineering", summary: "" },
  { id: "professional-services", slug: "professional-services", title: "Professional Services", summary: "" },
];

export function ContactClient({ pageData, services = [], contactSettings }: ContactClientProps) {
  const salesEmail = publicContactValue(contactSettings?.salesEmail);
  const supportEmail = publicContactValue(contactSettings?.supportEmail);
  const phone = publicContactValue(contactSettings?.phone);
  const phoneHours = publicContactValue(contactSettings?.phoneHours);
  const location = publicContactValue(contactSettings?.hqAddress);
  const locationDetails = publicContactValue(contactSettings?.hqDetails);
  const selectableServices = services.length > 0 ? services : fallbackServices;
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    company: "",
    service: "",
    message: "",
    _hp: "", // Honeypot security field
  });

  const [formErrors, setFormErrors] = React.useState({
    name: "",
    email: "",
    message: "",
  });

  const [touched, setTouched] = React.useState({
    name: false,
    email: false,
    message: false,
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  // Parse custom sections from DB
  const heroSection = pageData?.sections?.find((s) => {
    const type = s.sectionType?.toLowerCase() || "";
    return type === "hero" || type === "contact_hero";
  });
  const contactSection = pageData?.sections?.find((s) => {
    const type = s.sectionType?.toLowerCase() || "";
    return type === "contact section" || type === "contact_form";
  });

  const heroTag = heroSection?.subtitle || "Connect with CYVRIX";
  const heroTitleText = heroSection?.title || "Start a practical technology conversation.";
  const heroDescriptionText = heroSection?.body || "Tell us about the support, project or risk you are assessing. We will use the context you share to identify an appropriate next step.";

  const formTitleText = contactSection?.title || "Tell us about the work";
  const formSubtitleText = contactSection?.body || "Share the essential context. Please do not include passwords, access tokens or sensitive configuration data.";
  const heroBackgroundImage = heroSection?.mediaId || pageData?.featuredImage || "";

  const renderTitle = (titleString: string) => {
    const words = titleString.trim().split(" ");
    if (words.length <= 2) {
      return <span className="text-gradient-neon">{titleString}</span>;
    }
    const lastWords = words.slice(-2).join(" ");
    const remainingWords = words.slice(0, -2).join(" ");
    return (
      <>
        {remainingWords}{" "}
        <span className="text-gradient-neon block sm:inline">{lastWords}</span>
      </>
    );
  };

  // Validate fields in real time
  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "name") {
      if (!value.trim()) {
        error = "Name is required";
      } else if (value.trim().length < 2) {
        error = "Name must be at least 2 characters";
      }
    } else if (name === "email") {
      if (!value.trim()) {
        error = "Work email is required";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          error = "Please enter a valid work email address";
        }
      }
    } else if (name === "message") {
      if (!value.trim()) {
        error = "Message is required";
      } else if (value.trim().length < 10) {
        error = "Message must be at least 10 characters";
      }
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name as keyof typeof touched]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const isFormValid =
    formData.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) &&
    formData.message.trim().length >= 10 &&
    !formErrors.name &&
    !formErrors.email &&
    !formErrors.message &&
    consent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({ name: true, email: true, message: true });
    
    // Final validation checks
    validateField("name", formData.name);
    validateField("email", formData.email);
    validateField("message", formData.message);

    if (!isFormValid) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/submit-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, consent: consent ? "on" : "" }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          company: "",
          service: "",
          message: "",
          _hp: "",
        });
        setTouched({ name: false, email: false, message: false });
        setConsent(false);
      } else {
        setSubmitStatus("error");
        setSubmitError(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitStatus("error");
      setSubmitError("Network connection error. Please verify your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 lg:pt-36 pb-32 bg-[#020817] min-h-screen relative overflow-hidden">
      {/* Background Gradients, Glows & Admin CMS Uploaded Image */}
      {heroBackgroundImage ? (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-20 mix-blend-luminosity pointer-events-none" 
          style={{ backgroundImage: `url(${heroBackgroundImage})` }}
        />
      ) : (
        <>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#2691F0]/10 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#06b6d4]/10 rounded-full blur-[140px] pointer-events-none z-0" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/10 via-[#020817]/70 to-[#020817] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-corporate-grid opacity-30 z-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-[#2691F0] text-xs font-black uppercase tracking-widest mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{heroTag}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-outfit text-5xl md:text-6xl lg:text-7xl font-black text-white leading-none tracking-tight mb-6"
          >
            {renderTitle(heroTitleText)}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            {heroDescriptionText}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT COLUMN: Beautiful Form Panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <div className="glass-panel p-8 md:p-10 rounded-3xl border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#2691F0]/20 to-transparent blur-2xl pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {submitStatus === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="text-center py-12 px-4"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 animate-bounce">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="font-outfit text-3xl font-black text-white mb-4">Enquiry received</h2>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto mb-8">
                      Thank you for contacting CYVRIX. We will review the details you have shared and respond using the email address provided.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => setSubmitStatus("idle")}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold py-3.5 px-6 transition-all"
                      >
                        Send another message
                      </button>
                      <Link
                        href="/services"
                        className="bg-[#2691F0] hover:bg-[#2691F0]/80 text-white rounded-xl font-bold py-3.5 px-6 transition-all inline-flex items-center justify-center gap-2"
                      >
                        <span>Explore Our Services</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Honeypot field for bot protection */}
                    <input
                      type="text"
                      name="_hp"
                      value={formData._hp}
                      onChange={handleInputChange}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <div className="flex flex-col border-b border-white/5 pb-4 mb-2">
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-[#2691F0]" />
                        <h2 className="font-outfit text-xl font-bold text-white">{formTitleText}</h2>
                      </div>
                      {formSubtitleText && (
                        <p className="text-xs text-slate-400 mt-1 font-medium">{formSubtitleText}</p>
                      )}
                    </div>

                    {submitStatus === "error" && (
                      <div className="flex gap-3 items-center p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="font-semibold">{submitError}</p>
                      </div>
                    )}

                    {/* Grid Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Name input */}
                      <div className="relative group">
                        <input
                          required
                          type="text"
                          name="name"
                          id="name"
                          aria-label="Full name"
                          value={formData.name}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="Your full name *"
                          className={`w-full rounded-2xl border ${
                            touched.name && formErrors.name
                              ? "border-rose-500/50 bg-rose-500/5"
                              : "border-white/10 bg-white/5 focus:border-[#2691F0]/50"
                          } px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-medium`}
                        />
                        {touched.name && formErrors.name && (
                          <div className="absolute right-3 top-4 text-rose-400 flex items-center gap-1.5 text-xs font-semibold">
                            <AlertCircle className="h-4 w-4" />
                            <span>{formErrors.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Email input */}
                      <div className="relative group">
                        <input
                          required
                          type="email"
                          name="email"
                          id="email"
                          aria-label="Work email address"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="Work email address *"
                          className={`w-full rounded-2xl border ${
                            touched.email && formErrors.email
                              ? "border-rose-500/50 bg-rose-500/5"
                              : "border-white/10 bg-white/5 focus:border-[#2691F0]/50"
                          } px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-medium`}
                        />
                        {touched.email && formErrors.email && (
                          <div className="absolute right-3 top-4 text-rose-400 flex items-center gap-1.5 text-xs font-semibold">
                            <AlertCircle className="h-4 w-4" />
                            <span>{formErrors.email}</span>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Company input */}
                      <div className="relative group">
                        <input
                          type="text"
                          name="company"
                          id="company"
                          aria-label="Company name"
                          value={formData.company}
                          onChange={handleInputChange}
                          placeholder="Company name (optional)"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 focus:border-[#2691F0]/50 px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-medium"
                        />
                      </div>

                      {/* Service selector */}
                      <div className="relative group">
                        <select
                          name="service"
                          id="service"
                          aria-label="Area of interest"
                          value={formData.service}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 focus:border-[#2691F0]/50 px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-medium appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#020817] text-slate-400">Select area of interest</option>
                          {selectableServices.map((svc) => (
                            <option key={svc.id} value={svc.title} className="bg-[#020817] text-white">
                              {svc.title}
                            </option>
                          ))}
                          <option value="other" className="bg-[#020817] text-white">Other Technology Consulting</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>

                    </div>

                    {/* Message input */}
                    <div className="relative group">
                      <textarea
                        required
                        name="message"
                        id="message"
                        aria-label="Technology challenge or project scope"
                        rows={5}
                        value={formData.message}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="What technology challenge or project scope are you looking to tackle? *"
                        className={`w-full rounded-2xl border ${
                          touched.message && formErrors.message
                            ? "border-rose-500/50 bg-rose-500/5"
                            : "border-white/10 bg-white/5 focus:border-[#2691F0]/50"
                        } px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-medium resize-none`}
                      />
                      {touched.message && formErrors.message && (
                        <div className="absolute right-3 top-4 text-rose-400 flex items-center gap-1.5 text-xs font-semibold">
                          <AlertCircle className="h-4 w-4" />
                          <span>{formErrors.message}</span>
                        </div>
                      )}
                      
                      {/* Character Counter */}
                      <div className="flex justify-end text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1.5">
                        <span>{formData.message.length} / 5000 characters</span>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300">
                      <input
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#2691F0]"
                      />
                      <span>
                        I consent to CYVRIX processing this enquiry in accordance with the{" "}
                        <Link href="/privacy-policy" className="text-sky-300 underline underline-offset-2 hover:text-white">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting || !isFormValid}
                      className={`w-full flex items-center justify-center gap-2 rounded-2xl font-bold py-4 transition-all duration-300 ${
                        submitting
                          ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                          : isFormValid
                          ? "bg-[#2691F0] hover:bg-[#2691F0]/85 text-white shadow-lg shadow-[#2691F0]/25 cursor-pointer transform hover:-translate-y-0.5"
                          : "bg-slate-800/50 text-slate-500 border border-white/5 cursor-not-allowed"
                      }`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Sending enquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Send enquiry</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Interactive Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-5 space-y-8"
          >
            
            {/* Contact Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {salesEmail && <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Sales & Consulting</h3>
                <a href={`mailto:${salesEmail}`} className="text-slate-400 hover:text-white text-sm transition-colors font-medium mb-3 block">
                  {salesEmail}
                </a>
                <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">
                  New technology enquiries
                </span>
              </div>}

              {supportEmail && <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <Headphones className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Technical Support Desk</h3>
                <a href={`mailto:${supportEmail}`} className="text-slate-400 hover:text-white text-sm transition-colors font-medium mb-3 block">
                  {supportEmail}
                </a>
                <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">
                  Existing support queries
                </span>
              </div>}

              {/* Telephone Card */}
              {phone && <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <Phone className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Corporate Phone Line</h3>
                <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="text-slate-400 hover:text-white text-sm transition-colors font-medium mb-3 block">
                  {phone}
                </a>
                {phoneHours && <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">{phoneHours}</span>}
              </div>}

              {/* HQ Card */}
              {location && <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Service Location</h3>
                <span className="text-slate-400 text-sm font-medium mb-3 block">
                  {location}
                </span>
                {locationDetails && <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">{locationDetails}</span>}
              </div>}

              {!salesEmail && !supportEmail && !phone && !location && <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="font-outfit text-lg font-bold text-white">Use the enquiry form to get in touch</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">Direct contact details are published here once they have been configured and approved for public use.</p>
              </div>}

            </div>

            {/* Engagement expectations */}
            <div className="p-6 rounded-3xl glass-panel border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#2691F0]" />
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-white text-lg mb-2">Engagement expectations</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    Response and escalation targets are agreed for the specific engagement, rather than assumed in public copy.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-slate-400 font-semibold">New enquiries</span>
                      <span className="text-[#2691F0] font-black uppercase tracking-wider">Reviewed by the team</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-slate-400 font-semibold">Existing support</span>
                      <span className="text-emerald-400 font-black uppercase tracking-wider">Use agreed support routes</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">On-site work</span>
                      <span className="text-[#06b6d4] font-black uppercase tracking-wider">Planned to project needs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery principles */}
            <div className="p-6 rounded-3xl glass-panel-subtle border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h4 className="font-outfit font-bold text-white text-base">Delivery principles</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2 text-xs">
                  <Lock className="h-4 w-4 text-[#2691F0] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Security planning</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Built into the scope</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Evidence requirements</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Agreed before delivery</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Server className="h-4 w-4 text-[#06b6d4] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Data protection</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Considered in delivery</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Building className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Trust records</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Published when verified</p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>


        </div>

      </div>
    </div>
  );
}
