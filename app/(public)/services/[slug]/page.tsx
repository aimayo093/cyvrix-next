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
import { findService as findStaticService, services as staticServices } from "@/lib/cyvrix-data";
import { prisma } from "@/lib/prisma";

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const services = await prisma.service.findMany({ select: { slug: true } });
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await prisma.service.findUnique({ where: { slug } });
  return {
    title: service ? `${service.title} | CYVRIX Technologies` : "Service Detail",
    description: service ? service.summary : "Cybersecurity & Technology Services",
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await prisma.service.findUnique({ where: { slug } });
  if (!service) notFound();

  // Load fallback content arrays (features, process, faqs, includes) if they exist
  const staticSvc = findStaticService(slug);
  const content = service.content as any;
  const features = content?.features?.length ? content.features : (staticSvc?.features || []);
  const processSteps = content?.process?.length ? content.process : (staticSvc?.process || []);
  const includes = content?.includes?.length ? content.includes : (staticSvc?.includes || []);
  const faqs = content?.faqs?.length ? content.faqs : (staticSvc?.faqs || []);

  const relatedDb = await prisma.service.findMany({
    where: { slug: { not: service.slug }, published: true },
    take: 3
  });
  const related = relatedDb.map(r => {
    const s = findStaticService(r.slug);
    return { ...r, icon: s?.icon };
  });

  return (
    <div className="pt-24 pb-20 bg-[#020817] text-white">
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
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#2691F0] bg-[#2691F0]/100/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
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
              {includes.map((item: string, idx: number) => (
                <li key={idx} className="flex gap-3 text-slate-400 text-sm leading-relaxed">
                  <Check className="h-5 w-5 text-[#2691F0] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Ideal For" icon={Target}>
            <p className="text-slate-400 leading-relaxed text-sm">
              {staticSvc?.audience || "Business"}
            </p>
            <div className="mt-8 p-5 bg-[#2691F0]/10/50 rounded-2xl border border-blue-100/50 text-slate-500 text-xs leading-relaxed font-semibold">
              Leverage custom cybersecurity and robust cloud structures shaped specifically for UK compliance frameworks.
            </div>
          </Panel>

          <Panel title="Problems Solved" icon={TrendingUp}>
            <ul className="space-y-4">
              {(staticSvc?.problems || []).map((item: string, idx: number) => (
                <li key={idx} className="flex gap-3 text-slate-400 text-sm leading-relaxed">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </section>

      {/* Detailed Features & Process */}
      <section className="bg-[#020817] border-y border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <div className="flex items-center gap-2 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-4">
                <Award className="h-4 w-4" /> Professional Architecture
              </div>
              <h2 className="font-outfit text-3xl md:text-4xl font-black mb-8 text-white">
                Key features designed for resiliency
              </h2>
              <ul className="space-y-5">
                {features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex gap-4 p-5 rounded-2xl bg-[#020817] border border-white/5 hover:border-blue-100 transition-all">
                    <span className="w-8 h-8 rounded-full bg-[#2691F0]/10 text-[#2691F0] font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-black text-sm text-white">{feature}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-[#2691F0] text-xs font-black uppercase tracking-widest mb-4">
                <Shield className="h-4 w-4" /> Operational Method
              </div>
              <h2 className="font-outfit text-3xl md:text-4xl font-black mb-8 text-white">
                CYVRIX Delivery Process
              </h2>
              <ul className="space-y-5">
                {processSteps.map((step: string, idx: number) => (
                  <li key={idx} className="flex gap-4 p-5 rounded-2xl bg-[#2691F0]/10 border border-[#2691F0]/10 hover:border-[#2691F0]/20 transition-all">
                    <span className="w-8 h-8 rounded-full bg-[#2691F0] text-white font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-black text-sm text-white">{step}</p>
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
              {staticSvc?.compliance || "Standard"}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
              <Shield className="h-4 w-4 text-emerald-500" />
              Fully verified in compliance with Cyber Essentials, GDPR, and ISO 27001 requirements.
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ preview */}
      <section className="bg-[#020817] py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#2691F0]">FAQ</span>
            <h2 className="font-outfit text-3xl font-black text-white mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq: { question: string; answer: string }, idx: number) => (
              <details 
                key={idx} 
                className="group rounded-2xl border border-white/10 p-6 bg-[#020817] hover:border-[#2691F0]/40 transition-all"
              >
                <summary className="cursor-pointer font-bold font-outfit text-white list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-slate-400 group-hover:text-[#2691F0] font-bold text-xl leading-none transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-400 border-t border-white/5 pt-4">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="prose prose-slate max-w-none text-slate-400 space-y-6 mt-16">
            {content?.body ? (
              <div dangerouslySetInnerHTML={{ __html: content.body.replace(/\n/g, '<br/>') }} />
            ) : (
              <>
                <p>
                  <strong>{service.title}</strong> helps businesses scale securely and efficiently. We provide tailored solutions that align with your strategic objectives, reducing risk and improving operational capabilities.
                </p>
                <p>
                  Our approach goes beyond reactive fixes. We implement proactive measures and robust architectures to ensure your digital environment is resilient and performant. 
                </p>
                <p>
                  Partner with CYVRIX to leverage enterprise-grade technology solutions designed specifically for the unique demands of your industry.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-[#2691F0]">Explore</span>
          <h2 className="font-outfit text-3xl font-black text-white mt-3">
            Often Paired Services
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {related.map((item) => (
            <Link 
              key={item.slug} 
              href={`/services/${item.slug}`} 
              className="p-6 rounded-2xl border border-white/10 bg-[#020817] hover:border-[#2691F0] hover:shadow-xl transition-all font-bold text-white flex items-center justify-between group"
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
    <div className="rounded-3xl border border-slate-200/80 bg-[#020817] p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-[#2691F0]/10 text-[#2691F0] flex items-center justify-center mb-6">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-outfit text-xl font-black text-white mb-6">{title}</h3>
      {children}
    </div>
  );
}
