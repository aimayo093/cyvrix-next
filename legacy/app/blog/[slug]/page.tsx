import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CTASection, Hero } from "@/components/site/Sections";
import { blogPosts } from "@/lib/cyvrix-data";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  return { title: post ? post.title : "Insight" };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) notFound();
  return (
    <div>
      <Navbar />
      <Hero eyebrow={post.category} title={post.title} subtitle={post.excerpt} />
      <article className="mx-auto max-w-3xl bg-white px-5 py-16 leading-8 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
        <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">{post.author} - {post.published}</p>
        <p className="mt-8">This article is managed by the CYVRIX CMS and supports draft status, categories, tags, author profiles, featured imagery, Open Graph fields, and SEO metadata.</p>
        <p className="mt-6">For UK SMEs, the best technology guidance is specific and operational. CYVRIX focuses on practical controls, recoverable systems, clear support ownership, and improvements that leadership can understand.</p>
        <div className="mt-8 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-md bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200">{tag}</span>)}</div>
      </article>
      <CTASection title="Need help applying this guidance?" />
      <Footer />
    </div>
  );
}
