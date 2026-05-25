import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, User, Bookmark } from "lucide-react";
import { blogPosts } from "@/lib/cyvrix-data";

export const metadata: Metadata = {
  title: "Insights & Technical Guidance | CYVRIX Technologies",
  description: "Practical guidance on cybersecurity, IT support, cloud operations, and business continuity from CYVRIX.",
};

export default function BlogListPage() {
  return (
    <div className="pt-24 pb-32 bg-[#020817]">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        
        {/* Header Block */}
        <div className="max-w-3xl mb-20">
          <span className="text-xs font-black uppercase tracking-widest text-[#2691F0] bg-[#2691F0]/100/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
            Technical Insights
          </span>
          <h1 className="font-outfit text-5xl md:text-6xl font-black text-white mt-6 mb-6 leading-tight">
            Security & Operations <br />
            <span className="text-[#2691F0]">decoded for UK business.</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed font-medium">
            Read actionable, simple guidance on risk protection, cloud hardening, managed endpoints, and recovery frameworks written directly by our senior engineers.
          </p>
        </div>

        {/* Featured Post Hero (if any, otherwise standard grids styled beautifully) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col bg-[#020817] rounded-3xl border border-white/10 shadow-sm hover:shadow-xl hover:border-[#2691F0] transition-all overflow-hidden"
            >
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2691F0] bg-[#2691F0]/10/80 px-2.5 py-1 rounded-md border border-[#2691F0]/10">
                    {post.category}
                  </span>
                </div>
                
                <h3 className="font-outfit text-2xl font-black text-white group-hover:text-[#2691F0] transition-colors leading-tight mb-4">
                  {post.title}
                </h3>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow">
                  {post.excerpt}
                </p>

                <div className="border-t border-white/5 pt-6 flex items-center justify-between text-xs text-slate-400 font-semibold mt-auto">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#2691F0]" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-300" />
                    {post.published}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
