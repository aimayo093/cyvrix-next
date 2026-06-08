import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateHomePageCMS } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Save, Home, Layout, MessageSquare, Megaphone, AlertCircle, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Home Page CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function HomeCmsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const homePage = await prisma.cmsPage.findUnique({
    where: { slug: "home" },
    include: {
      sections: true,
    },
  });

  if (!homePage) {
    return (
      <div className="p-6 text-center bg-rose-50 border border-rose-250 text-rose-800 rounded-2xl">
        <AlertCircle className="h-8 w-8 mx-auto text-rose-600 mb-2" />
        <h3 className="font-outfit font-black text-lg">Homepage Record Missing</h3>
        <p className="text-xs font-semibold mt-1">Please seed the database to create the home page sections.</p>
      </div>
    );
  }

  const sections = homePage.sections;
  
  const hero = sections.find((s) => s.sectionType === "Hero");
  const heroSettings = ((hero?.settingsJson ?? {}) as Record<string, any>);
  
  const services = sections.find((s) => s.sectionType === "Service cards");
  
  const why = sections.find((s) => s.sectionType === "Image and text");
  const whySettings = ((why?.settingsJson ?? {}) as Record<string, any>);
  
  const testimonials = sections.find((s) => s.sectionType === "Testimonials");
  
  const cta = sections.find((s) => s.sectionType === "CTA section");

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      {sp.status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          sp.status === "success" 
            ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
            : "bg-rose-50 border-rose-250 text-rose-800"
        }`}>
          {sp.status === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h4 className="font-outfit font-black text-sm uppercase tracking-wide">
              {sp.status === "success" ? "Operation Successful" : "Validation Error"}
            </h4>
            <p className="text-xs font-semibold mt-0.5 leading-relaxed">{sp.message}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]">Home Page CMS</h1>
        <p className="text-slate-500 text-sm mt-1">Manage the content, text, and media rendered by the homepage Section Renderer.</p>
      </div>

      <form action={updateHomePageCMS} className="space-y-8">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Home className="h-4 w-4 text-[#2691F0]" />
            <h2 className="font-outfit font-black text-[#041635]">Hero Section</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              Eyebrow (Subtitle field)
              <input name="hero.subtitle" defaultValue={hero?.subtitle ?? ""} placeholder="Trusted IT Partner for UK Businesses" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Hero Title
              <input name="hero.title" defaultValue={hero?.title ?? ""} placeholder="Secure, dependable IT support..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Hero Description (Body)
              <textarea name="hero.subtitle-desc" defaultValue={hero?.body ?? ""} rows={3} placeholder="Managed IT, cybersecurity, cloud..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                Primary Button Label
                <input name="hero.buttonLabel" defaultValue={hero?.buttonLabel ?? ""} placeholder="Request an IT Audit" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Primary Button URL
                <input name="hero.buttonUrl" defaultValue={hero?.buttonUrl ?? ""} placeholder="/book-consultation" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                Secondary Button Label
                <input name="hero.secondaryCtaLabel" defaultValue={heroSettings.secondaryCtaLabel ?? ""} placeholder="Explore Our Services" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Secondary Button URL
                <input name="hero.secondaryCtaUrl" defaultValue={heroSettings.secondaryCtaUrl ?? ""} placeholder="/services" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Hero Background Image</p>
              <ImageUpload name="hero.mediaId" defaultValue={hero?.mediaId ?? ""} />
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Layout className="h-4 w-4 text-[#2691F0]" />
            <h2 className="font-outfit font-black text-[#041635]">Services Grid Section</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              Services Section Title
              <input name="services.title" defaultValue={services?.title ?? ""} placeholder="Comprehensive IT Solutions" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Services Section Subtitle
              <textarea name="services.subtitle" defaultValue={services?.subtitle ?? ""} rows={3} placeholder="From day-to-day helpdesk support to complex cloud migrations..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                Services Button Label
                <input name="services.buttonLabel" defaultValue={services?.buttonLabel ?? ""} placeholder="View All Services" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Services Button URL
                <input name="services.buttonUrl" defaultValue={services?.buttonUrl ?? ""} placeholder="/services" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
            </div>
          </div>
        </div>

        {/* Why Choose Us Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Layout className="h-4 w-4 text-[#2691F0]" />
            <h2 className="font-outfit font-black text-[#041635]">Why Choose Us Section</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                Subtitle (Eyebrow)
                <input name="why.subtitle" defaultValue={why?.subtitle ?? ""} placeholder="Why Choose CYVRIX" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Main Title
                <input name="why.title" defaultValue={why?.title ?? ""} placeholder="Your quiet partner in a noisy digital world." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-700">
              Description
              <textarea name="why.body" defaultValue={why?.body ?? ""} rows={3} placeholder="We believe that great IT should be invisible..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Selling Points (One per line)
              <textarea name="why.points" defaultValue={whySettings.points ? whySettings.points.join("\n") : ""} rows={4} placeholder="No generic fixes. We resolve the root cause of issues." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none font-sans" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                Button Label
                <input name="why.buttonLabel" defaultValue={why?.buttonLabel ?? ""} placeholder="Meet The Team" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Button URL
                <input name="why.buttonUrl" defaultValue={why?.buttonUrl ?? ""} placeholder="/about" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Team / Office Image</p>
              <ImageUpload name="why.mediaId" defaultValue={why?.mediaId ?? ""} />
            </div>
          </div>
        </div>

        {/* Testimonials Title Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#2691F0]" />
            <h2 className="font-outfit font-black text-[#041635]">Testimonials Section</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              Testimonials Title
              <input name="testimonials.title" defaultValue={testimonials?.title ?? ""} placeholder="Client Success" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Testimonials Subtitle
              <input name="testimonials.subtitle" defaultValue={testimonials?.subtitle ?? ""} placeholder="What our clients say about partnering with CYVRIX" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#2691F0]" />
            <h2 className="font-outfit font-black text-[#041635]">Final Call-to-Action Section</h2>
          </div>
          <div className="p-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              CTA Title
              <input name="cta.title" defaultValue={cta?.title ?? ""} placeholder="Secure your business future today." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              CTA Description
              <textarea name="cta.body" defaultValue={cta?.body ?? ""} rows={3} placeholder="Speak to one of our technical architects..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-bold text-slate-700">
                CTA Button Label
                <input name="cta.buttonLabel" defaultValue={cta?.buttonLabel ?? ""} placeholder="Request Free Audit" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                CTA Button URL
                <input name="cta.buttonUrl" defaultValue={cta?.buttonUrl ?? ""} placeholder="/book-consultation" className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
              </label>
            </div>
          </div>
        </div>

        <Button type="submit" className="bg-[#041635] text-white hover:bg-[#2691F0] px-6 py-3 rounded-xl font-bold flex items-center gap-2 w-full justify-center">
          <Save className="h-5 w-5" /> Save Homepage Sections
        </Button>
      </form>
    </div>
  );
}
