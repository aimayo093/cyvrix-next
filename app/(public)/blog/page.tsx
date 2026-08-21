import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, User } from "lucide-react";
import { getPublicInsights } from "@/lib/public-cache";
import { getStaticPublicInsights, toPublicInsight, type PublicInsight } from "@/lib/public-insight";

export const metadata: Metadata = {
  title: "Insights & Technical Guidance",
  description: "Practical guidance on cybersecurity, IT support, cloud operations, and business continuity from CYVRIX.",
};

export default async function BlogListPage() {
  const publishedInsights = (await getPublicInsights())
    .map(toPublicInsight)
    .filter((insight): insight is PublicInsight => insight !== null);
  const insights = publishedInsights.length > 0 ? publishedInsights : getStaticPublicInsights();

  return (
    <div className="min-h-screen bg-[#020817] pb-28 pt-24">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="max-w-3xl mb-14 md:mb-16">
          <span className="inline-flex rounded-full border border-[#2691F0]/30 bg-[#2691F0]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7ab8f4]">
            CYVRIX Insights
          </span>
          <h1 className="mt-6 font-outfit text-4xl font-black leading-tight text-white md:text-6xl">
            Clear technology guidance for <span className="text-[#2691F0]">better decisions.</span>
          </h1>
          <p className="mt-6 text-lg font-medium leading-relaxed text-slate-300">
            Practical perspectives on managing, securing and modernising business technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {insights.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex h-full flex-col rounded-3xl border border-white/10 bg-[#071126] p-7 transition-colors hover:border-[#2691F0]/70 hover:bg-[#0a1834] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2691F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]"
            >
              <span className="w-fit rounded-md border border-[#2691F0]/20 bg-[#2691F0]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#7ab8f4]">
                {post.category}
              </span>

              <h2 className="mt-6 font-outfit text-2xl font-black leading-tight text-white transition-colors group-hover:text-[#7ab8f4]">
                {post.title}
              </h2>

              <p className="mt-4 flex-grow text-sm leading-relaxed text-slate-300">
                {post.excerpt}
              </p>

              <div className="mt-8 border-t border-white/10 pt-5">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#7ab8f4]" />
                    {post.author}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-[#7ab8f4]" />
                    {post.published}
                  </span>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#7ab8f4]">
                  Read insight <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
