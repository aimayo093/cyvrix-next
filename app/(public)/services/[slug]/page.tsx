import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Check, 
  HelpCircle, 
  HelpCircle as QuestionIcon,
  Shield, 
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Target
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { findService, services } from "@/lib/cyvrix-data";

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = findService(slug);
  return {
    title: service ? `${service.title} | CYVRIX Technologies` : "Service Detail",
    description: service ? service.summary : "Cybersecurity & Technology Services",
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) notFound();

  const related = services.filter((item) => item.slug !== service.slug).slice(0, 3);

  return (
    <div className="pt-24 pb-20 bg-slate-50 text-[#041635]">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#041635] to-[#0a2a5e] py-20 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-[#2691F0]/10 rounded-full blur-[120px]" />
        
        <div className="max-w-7xl mx-auto px-5 lg:px-8 relative z-10">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2691F0] hover:text-[#2691F0]/80 transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to All Services
          </Link>
          
          <div className="max-w-4xl">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#2691F0] bg-blue-500/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
              Enterprise Technology
            </span>
            <h1 className="font-outfit text-4xl md:text-5.5xl font-black mt-6 tracking-tight leading-tight">
              {service.title}
            </h1>
            <p className="text-slate-300 font-medium text-lg md:text-xl leading-relaxed mt-6 max-w-3xl">
              {service.summary}
            </p>
            
            <div className="flex flex-wrap gap-4 mt-10">
              <Link href="/request-quote">
                <Button variant="premium" className="bg-[#2691F0] text-white hover:bg-blue-600 border-none shadow-lg shadow-blue-500/20">
                  Request Free Quote
                </Button>
              </Link>
              <Link href="/book-consultation">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Book a Consultation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Insights: Grid */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Panel title="What is Included" icon={Zap}>
            <ul className="space-y-4">
              {service.includes.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                  <Check className="h-5 w-5 text-[#2691F0] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Ideal For" icon={Target}>
            <p className="text-slate-600 leading-relaxed text-sm">
              {service.audience}
            </p>
            <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-slate-500 text-xs leading-relaxed font-semibold">
              Leverage custom cybersecurity and robust cloud structures shaped specifically for UK compliance frameworks.
            </div>
          </Panel>

          <Panel title="Problems Solved" icon={TrendingUp}>
            <ul className="space-y-4">
              {service.problems.map((item, idx) => (
                <li key={idx} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </section>

      {/* Detailed Features & Process */}
      <section className="bg-white border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <div className="flex items-center gap-2 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-4">
                <Award className="h-4 w-4" /> Professional Architecture
              </div>
              <h2 className="font-outfit text-3xl md:text-4xl font-black mb-8 text-[#041635]">
                Key features designed for resiliency
              </h2>
              <ul className="space-y-5">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-all">
                    <span className="w-8 h-8 rounded-full bg-blue-50 text-[#2691F0] font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-black text-sm text-[#041635]">{feature}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-4">
                <Shield className="h-4 w-4" /> Operational Method
              </div>
              <h2 className="font-outfit text-3xl md:text-4xl font-black mb-8 text-[#041635]">
                CYVRIX Delivery Process
              </h2>
              <ul className="space-y-5">
                {service.process.map((step, idx) => (
                  <li key={idx} className="flex gap-4 p-5 rounded-2xl bg-[#EAF4FF]/40 border border-[#2691F0]/10 hover:border-[#2691F0]/20 transition-all">
                    <span className="w-8 h-8 rounded-full bg-[#2691F0] text-white font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-black text-sm text-[#041635]">{step}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Auditing Section */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="bg-[#041635] text-white rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-[400px] h-[400px] bg-[#2691F0]/10 rounded-full blur-[100px]" />
          <div className="relative z-10 max-w-3xl">
            <span className="text-xs font-black uppercase tracking-widest text-[#2691F0] mb-4 block">
              Security & Trust Integration
            </span>
            <h2 className="font-outfit text-3.5xl font-black mb-6">
              Assuring compliance and risk protection
            </h2>
            <p className="text-slate-300 leading-relaxed text-md font-medium mb-8">
              {service.compliance}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
              <Shield className="h-4 w-4 text-emerald-500" />
              Fully verified in compliance with Cyber Essentials, GDPR, and ISO 27001 requirements.
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ preview */}
      <section className="bg-white py-20 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#2691F0]">FAQ</span>
            <h2 className="font-outfit text-3xl font-black text-[#041635] mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {service.faqs.map((faq, idx) => (
              <details 
                key={idx} 
                className="group rounded-2xl border border-slate-200 p-6 bg-white hover:border-[#2691F0]/40 transition-all"
              >
                <summary className="cursor-pointer font-bold font-outfit text-[#041635] list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-slate-400 group-hover:text-[#2691F0] font-bold text-xl leading-none transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-4">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-[#2691F0]">Explore</span>
          <h2 className="font-outfit text-3xl font-black text-[#041635] mt-3">
            Often Paired Services
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {related.map((item) => (
            <Link 
              key={item.slug} 
              href={`/services/${item.slug}`} 
              className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#2691F0] hover:shadow-xl transition-all font-bold text-[#041635] flex items-center justify-between group"
            >
              <span>{item.title}</span>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#2691F0] group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({ 
  title, 
  children, 
  icon: Icon 
}: { 
  title: string; 
  children: React.ReactNode; 
  icon: React.ComponentType<{ className?: string }> 
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2691F0] flex items-center justify-center mb-6">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-outfit text-xl font-black text-[#041635] mb-6">{title}</h3>
      {children}
    </div>
  );
}
