import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Waypoints } from "lucide-react";
import { SectionRenderer } from "@/components/shared/SectionRenderer";
import { getPublicPageData, getPublicPageSeoMetadata } from "@/lib/public-cache";
import { stripBrandSuffix } from "@/lib/utils";


export async function generateMetadata() {
  const page = await getPublicPageSeoMetadata("about");
  return {
    title: stripBrandSuffix(page?.seoTitle) || "About",
    description: page?.seoDescription || "CYVRIX helps organisations manage, secure and modernise the technology their people rely on.",
  };
}

export default async function AboutPage() {
  const { pageData, services, testimonials, partners, trustedLogos, complianceCards } =
    await getPublicPageData("about");
  const sections = pageData?.sections || [];

  return (
    <div className="min-h-screen bg-[#020817]">
      {sections.length > 0 ? (
        <SectionRenderer
          sections={sections}
          services={services}
          testimonials={testimonials}
          partners={partners}
          trustedLogos={trustedLogos}
          complianceCards={complianceCards}
        />
      ) : (
        <AboutFallback />
      )}
    </div>
  );
}

function AboutFallback() {
  const principles = [
    {
      title: "Start with context",
      description: "Understand the people, systems, suppliers and operational priorities before recommending a change.",
      icon: Waypoints,
    },
    {
      title: "Keep security practical",
      description: "Build sensible protection, access control and recovery considerations into day-to-day technology decisions.",
      icon: ShieldCheck,
    },
    {
      title: "Deliver with clear ownership",
      description: "Make the next step, decision-maker and working approach understandable throughout support and project work.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="pb-24 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <span className="inline-flex rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
            About CYVRIX
          </span>
          <h1 className="mt-6 max-w-4xl font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Technology that is dependable, understandable and ready for change.
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-200">
            CYVRIX brings managed IT, cloud, cybersecurity, infrastructure, field engineering and professional services into a practical delivery approach for growing organisations.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">How we work</p>
          <h2 className="mt-3 font-outfit text-3xl font-black leading-tight text-white md:text-4xl">A clear route from the work in front of you to useful next steps.</h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.title} className="rounded-3xl border border-white/10 bg-[#071126] p-7">
              <principle.icon className="h-6 w-6 text-[#7ab8f4]" />
              <h3 className="mt-6 font-outfit text-2xl font-black text-white">{principle.title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5">
        <div className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-8 md:flex md:items-end md:justify-between md:gap-10 md:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">Start a conversation</p>
            <h2 className="mt-3 font-outfit text-3xl font-black leading-tight text-white">Talk through the technology priority that matters now.</h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-200">We will use the context you share to identify the most appropriate service, project or assessment route.</p>
          </div>
          <Link href="/book-consultation" className="mt-7 inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#2691F0] px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-white hover:text-[#041635] md:mt-0">
            Book a technology review <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
