import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, Hero } from "@/components/site/Sections";
import { blogPosts } from "@/lib/cyvrix-data";

export const metadata = { title: "Insights" };

export default function BlogPage() {
  return (
    <div>
      <Navbar />
      <Hero eyebrow="Insights" title="Practical IT, cybersecurity, cloud, and continuity guidance" subtitle="A CMS-backed blog system with categories, tags, authors, SEO metadata, featured images, and draft/published status." />
      <section className="bg-white py-20 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 lg:grid-cols-3 lg:px-8">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="rounded-lg border border-slate-200 p-6 transition hover:border-cyan-400 dark:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-500">{post.category}</p>
              <h2 className="mt-4 font-outfit text-2xl font-black">{post.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{post.excerpt}</p>
              <p className="mt-5 text-xs font-bold text-slate-500">{post.author} - {post.published}</p>
            </Link>
          ))}
        </div>
      </section>
      <CTASection />
      <Footer />
    </div>
  );
}
