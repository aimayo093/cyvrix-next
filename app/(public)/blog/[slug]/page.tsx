import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, User } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { getPublicInsightDetail } from "@/lib/public-cache";
import {
  getInsightConsultationHref,
  getStaticPublicInsight,
  getStaticPublicInsights,
  toPublicInsight,
} from "@/lib/public-insight";
import { stripBrandSuffix } from "@/lib/utils";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveInsight(slug: string) {
  const publishedInsight = toPublicInsight(await getPublicInsightDetail(slug));
  return publishedInsight ?? getStaticPublicInsight(slug);
}

export function generateStaticParams() {
  return getStaticPublicInsights().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolveInsight(slug);

  if (!post) {
    return { title: "Insight not found" };
  }

  return {
    title: stripBrandSuffix(post.seoTitle) || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostDetailPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await resolveInsight(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "CYVRIX Technologies" },
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    mainEntityOfPage: `https://cyvrix.co.uk/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-[#020817] pb-24 pt-24 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top_right,_rgba(38,145,240,0.2),transparent_48%),linear-gradient(180deg,#071b3d_0%,#020817_100%)] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Insights
          </Link>

          <span className="mt-8 inline-flex rounded-md border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7ab8f4]">
            {post.category}
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {post.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-relaxed text-slate-200">
            {post.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-6 text-sm font-semibold text-slate-300">
            <span className="inline-flex items-center gap-2">
              <User className="h-4 w-4 text-[#7ab8f4]" />
              {post.author}
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#7ab8f4]" />
              {post.published}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <article className="rounded-3xl border border-white/10 bg-[#071126] p-7 shadow-2xl shadow-blue-950/20 md:p-10">
          <div className="space-y-6 text-base font-medium leading-8 text-slate-200 md:text-lg">
            {post.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {post.tags.length > 0 && (
            <div className="mt-12 border-t border-white/10 pt-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Topics</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside className="rounded-3xl border border-[#2691F0]/25 bg-[#061a3c] p-6 lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ab8f4]">Next step</p>
          <h2 className="mt-3 font-outfit text-2xl font-black leading-tight text-white">Discuss your technology priorities.</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">
            Start a practical conversation about the work in front of your organisation.
          </p>
          <Button asChild variant="premium" className="mt-6 h-auto w-full px-4 py-3 text-sm">
            <Link href={getInsightConsultationHref(post)}>
              Book a technology review <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </aside>
      </main>
    </div>
  );
}
