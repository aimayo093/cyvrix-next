import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Share2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { blogPosts } from "@/lib/cyvrix-data";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  return {
    title: post ? `${post.title} | CYVRIX Insights` : "Insight Detail",
    description: post ? post.excerpt : "Technical articles and security insights",
  };
}

export default async function BlogPostDetailPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <div className="pt-24 pb-20 bg-[#020817] text-white">
      {/* Article Header block */}
      <section className="bg-gradient-to-b from-[#041635] to-[#0a2a5e] py-20 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#2691F0]/10 rounded-full blur-[100px]" />
        
        <div className="max-w-4xl mx-auto px-5 relative z-10">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2691F0] hover:text-[#2691F0]/80 transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Insights
          </Link>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2691F0] bg-[#2691F0]/100/10 px-3 py-1.5 rounded-md border border-[#2691F0]/20">
              {post.category}
            </span>
            <h1 className="font-outfit text-3.5xl md:text-5xl font-black mt-6 tracking-tight leading-tight">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-6 mt-8 text-sm text-slate-300 font-semibold border-t border-white/5 pt-6">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#2691F0]" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                {post.published}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-12">
          {/* Main content body */}
          <article className="bg-[#020817] p-8 md:p-12 rounded-3xl border border-slate-200/80 shadow-xl shadow-blue-500/5 leading-relaxed text-slate-400 text-md font-medium">
            <p className="text-lg text-white font-semibold leading-relaxed mb-6">
              {post.excerpt}
            </p>
            
            <p className="mb-6">
              This article is fully dynamic and managed by the secure CYVRIX CMS. In production environments, administrators can configure tags, authorship profiles, featured images, and search engine fields without touching any code.
            </p>

            <p className="mb-8">
              For growing organisations in the United Kingdom, security and IT systems should be treated as enablers for operations rather than static expenses. CYVRIX ensures that advice is calm, actionable, and aligned with standard compliance mandates such as GDPR and Cyber Essentials.
            </p>

            {/* Simulated Section Content */}
            <div className="my-8 p-6 bg-[#020817] rounded-2xl border border-white/10 text-slate-500 text-sm leading-relaxed relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldAlert className="h-20 w-20 text-white" />
              </div>
              <h4 className="font-outfit text-lg font-black text-white mb-2">Technical Warning</h4>
              <p>
                Cyber threats targeting UK SMEs are increasing in operational sophistication. Maintain clear endpoints hardening plans, configure robust multi-factor validation, and routinely audit active admin privileges.
              </p>
            </div>

            {/* Tag List */}
            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-white/5">
              {post.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="rounded-lg bg-[#2691F0] border border-[#2691F0]/10 px-3 py-1.5 text-xs font-black text-[#2691F0]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </article>

          {/* Sidebar block */}
          <aside className="space-y-6">
            <div className="bg-gradient-to-b from-[#041635] to-[#0a2a5e] text-white p-6 rounded-3xl text-center">
              <h4 className="font-outfit font-bold text-md mb-2">Need Guidance?</h4>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Consult with our senior technical engineering leads about implementing secure operations.
              </p>
              <Link href="/request-quote">
                <Button variant="premium" className="w-full text-xs py-2 bg-[#2691F0] hover:bg-blue-600 border-none">
                  Book consultation
                </Button>
              </Link>
            </div>

            <div className="bg-[#020817] p-6 rounded-3xl border border-white/10 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Share Article</p>
              <div className="flex justify-center gap-3">
                <button className="p-3 bg-[#020817] hover:bg-[#2691F0] hover:text-[#2691F0] rounded-xl transition-all border border-white/5 text-slate-400">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
