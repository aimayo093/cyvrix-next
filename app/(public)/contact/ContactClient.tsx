"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
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
  HelpCircle,
  Sparkles,
  Server,
  Lock,
  Headphones
} from "lucide-react";

interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

interface FAQItem {
  id?: string;
  question: string;
  answer: string;
}

interface ContactClientProps {
  pageData?: any;
  services: Service[];
  industries?: any[];
  faqs?: FAQItem[];
}

export function ContactClient({ pageData, services = [], faqs: dbFaqs = [] }: ContactClientProps) {
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

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  // Parse custom sections from DB
  const heroSection = pageData?.sections?.find((s: any) => {
    const type = s.sectionType?.toLowerCase() || "";
    return type === "hero" || type === "contact_hero";
  });
  const contactSection = pageData?.sections?.find((s: any) => {
    const type = s.sectionType?.toLowerCase() || "";
    return type === "contact section" || type === "contact_form";
  });

  const heroTag = heroSection?.subtitle || "Connect with CYVRIX";
  const heroTitleText = heroSection?.title || "Let's build secure digital capability.";
  const heroDescriptionText = heroSection?.body || "Speak directly with our senior technology specialists. No sales gatekeepers, just practical engineering guidance tailored to your operational goals.";

  const formTitleText = contactSection?.title || "Project Consultation Brief";
  const formSubtitleText = contactSection?.body || "We respond to all verified enquiries within 1 business day.";

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
    !formErrors.message;

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
        body: JSON.stringify(formData),
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
      } else {
        setSubmitStatus("error");
        setSubmitError(result.error || "Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setSubmitStatus("error");
      setSubmitError("Network connection error. Please verify your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const defaultFaqs = [
    {
      question: "What is your typical response time for general inquiries?",
      answer: "Our typical response time for general inquiries via this contact form is under 1 business hour. For existing clients on managed support, critical SLA tickets are responded to in under 15 minutes.",
    },
    {
      question: "Do you support businesses outside the UK?",
      answer: "While our core operations, engineers, and secure vaults are UK-based, we provide comprehensive remote support and engineering services for international branches of UK firms and partner companies globally.",
    },
    {
      question: "Can we request an on-site visit for IT audits?",
      answer: "Absolutely. We schedule structured IT audits, network architecture reviews, and cybersecurity posture reviews on-site at your offices. Please outline your location details in the message box.",
    },
    {
      question: "Do you offer custom SLA support agreements?",
      answer: "Yes. Every contract we construct can be custom-fitted with custom support scopes, dedicated virtual CIO advisory, custom coverage hours (including 24/7/365 operational monitoring), and distinct escalation rules.",
    },
  ];

  const activeFaqs = dbFaqs && dbFaqs.length > 0 ? dbFaqs : defaultFaqs;

  return (
    <div className="pt-24 lg:pt-36 pb-32 bg-[#020817] min-h-screen relative overflow-hidden">
      {/* Background Gradients, Glows & Admin CMS Uploaded Image */}
      {heroSection?.mediaId || pageData?.featuredImage ? (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-20 mix-blend-luminosity pointer-events-none" 
          style={{ backgroundImage: `url(${heroSection.mediaId || pageData.featuredImage})` }} 
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
                    <h2 className="font-outfit text-3xl font-black text-white mb-4">Transmission Successful</h2>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto mb-8">
                      Thank you for reaching out to CYVRIX. A senior member of our technology team has received your enquiry. We will contact you within 1 business hour.
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
                          value={formData.service}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 focus:border-[#2691F0]/50 px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-[#2691F0]/20 transition-all font-medium appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#020817] text-slate-400">Select area of interest</option>
                          {services.map((svc) => (
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
                          <span>Transmitting details...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Consultation Inquiry</span>
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
              
              {/* Sales Card */}
              <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Sales & Consulting</h3>
                <a href="mailto:sales@cyvrix.co.uk" className="text-slate-400 hover:text-white text-sm transition-colors font-medium mb-3 block">
                  sales@cyvrix.co.uk
                </a>
                <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">
                  Response SLA: &lt; 1hr
                </span>
              </div>

              {/* Support Card */}
              <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <Headphones className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Technical Support Desk</h3>
                <a href="mailto:support@cyvrix.co.uk" className="text-slate-400 hover:text-white text-sm transition-colors font-medium mb-3 block">
                  support@cyvrix.co.uk
                </a>
                <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">
                  15-min Critical SLA
                </span>
              </div>

              {/* Telephone Card */}
              <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <Phone className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">Corporate Phone Line</h3>
                <a href="tel:+442080808080" className="text-slate-400 hover:text-white text-sm transition-colors font-medium mb-3 block">
                  +44 (0) 20 8080 8080
                </a>
                <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">
                  Mon-Fri: 8am - 6pm
                </span>
              </div>

              {/* HQ Card */}
              <div className="p-6 rounded-2xl glass-panel-subtle border-white/5 hover:border-[#2691F0]/30 transition-all duration-300 group hover:shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#2691F0]/5 rounded-bl-full pointer-events-none group-hover:scale-150 transition-transform duration-300" />
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] mb-4 group-hover:bg-[#2691F0] group-hover:text-white transition-colors duration-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-outfit font-bold text-white text-base mb-1">London Headquarters</h3>
                <span className="text-slate-400 text-sm font-medium mb-3 block">
                  City of London, UK
                </span>
                <span className="text-[10px] font-black text-[#2691F0] uppercase tracking-wider block">
                  Secure Site Operations
                </span>
              </div>

            </div>

            {/* Response Time SLA Widget */}
            <div className="p-6 rounded-3xl glass-panel border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#2691F0]" />
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#2691F0] shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-white text-lg mb-2">Our Performance Service Levels</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    CYVRIX maintains contractual uptime and support SLAs. For general inquiries, we ensure rapid senior availability:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-slate-400 font-semibold">Virtual CIO Consultations</span>
                      <span className="text-[#2691F0] font-black uppercase tracking-wider">Same Business Day</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-slate-400 font-semibold">Critical Cybersecurity Escapes</span>
                      <span className="text-emerald-400 font-black uppercase tracking-wider">&lt; 15 Minutes SLA</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">UK Engineering Dispatch</span>
                      <span className="text-[#06b6d4] font-black uppercase tracking-wider">Under 4 Hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Certifications and Compliance Area */}
            <div className="p-6 rounded-3xl glass-panel-subtle border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h4 className="font-outfit font-bold text-white text-base">Standard Security & Compliance</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2 text-xs">
                  <Lock className="h-4 w-4 text-[#2691F0] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">ISO 27001</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Framework Aligned</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">Cyber Essentials</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Consultancy Certified</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Server className="h-4 w-4 text-[#06b6d4] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">GDPR Compliant</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Document Vault Protected</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <Building className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-300">UK Registered</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Incorporated in London</p>
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
