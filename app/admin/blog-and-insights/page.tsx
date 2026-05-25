import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createBlogPost,
  updateBlogPost,
  publishBlogPost,
  deleteBlogPost,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export const metadata = { title: "Blog & Insights | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function BlogCMSPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });

  const editing = sp.edit
    ? posts.find((p) => p.id === sp.edit) ?? null
    : null;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Blog & Insights</h1>
          <p className="text-slate-500 text-sm mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""} &mdash; write, publish, and manage your content.
          </p>
        </div>
        <a
          href="/admin/blog-and-insights?edit=new"
          className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#041635] transition-colors"
        >
          <Plus className="h-4 w-4" /> New Post
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {["Title", "Category", "Author", "Status", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {posts.map((post) => (
                <tr key={post.id} className={`hover:bg-slate-50/70 transition-colors ${editing?.id === post.id ? "bg-blue-50/50" : ""}`}>
                  <td className="px-6 py-4">
                    <p className="font-black text-[#041635] text-sm leading-snug">{post.title}</p>
                    <code className="text-[11px] text-slate-400">{post.slug}</code>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{post.category}</td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-semibold">{post.author}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      post.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    }`}>
                      {post.status === "PUBLISHED" ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/admin/blog-and-insights?edit=${post.id}`} className="p-2 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </a>
                      <form action={publishBlogPost}>
                        <input type="hidden" name="id" value={post.id} />
                        <button type="submit" className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title={post.status === "PUBLISHED" ? "Unpublish" : "Publish"}>
                          {post.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </form>
                      <form action={deleteBlogPost}>
                        <input type="hidden" name="id" value={post.id} />
                        <DeleteButton message={`Delete "${post.title}"?`} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No posts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <h2 className="font-outfit text-lg font-black text-[#041635] mb-1">
              {sp.edit === "new" ? "New Post" : editing ? `Editing: ${editing.title}` : "Select a post to edit"}
            </h2>
            <p className="text-xs text-slate-400 font-semibold mb-5">Saves directly to your Supabase database.</p>

            {sp.edit === "new" ? (
              <form action={createBlogPost} className="space-y-4">
                <BlogFormFields />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Create Post</Button>
              </form>
            ) : editing ? (
              <form action={updateBlogPost} className="space-y-4">
                <input type="hidden" name="id" value={editing.id} />
                <BlogFormFields defaults={{
                  title: editing.title,
                  slug: editing.slug,
                  body: editing.body ?? "",
                  author: editing.author ?? "",
                  category: editing.category ?? "",
                  tags: Array.isArray(editing.tags) ? (editing.tags as string[]).join(", ") : "",
                  seoTitle: (editing.seo as Record<string, string>)?.title ?? "",
                  seoDescription: (editing.seo as Record<string, string>)?.description ?? "",
                  image: editing.featuredImage ?? "",
                }} />
                <Button type="submit" className="w-full bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">Save Changes</Button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-300">
                <Pencil className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">Click the edit icon on any post to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogFormFields({ defaults }: { defaults?: Record<string, string> }) {
  return (
    <>
      <div className="block text-sm font-bold text-slate-700">
        Featured Image
        <div className="mt-1.5">
          <ImageUpload name="image" defaultValue={defaults?.image} />
        </div>
      </div>
      <label className="block text-sm font-bold text-slate-700">Title
        <input name="title" required defaultValue={defaults?.title} placeholder="e.g. A Microsoft 365 Security Baseline for UK SMEs"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-slate-700">Slug
          <input name="slug" defaultValue={defaults?.slug} placeholder="auto-generated"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
        <label className="block text-sm font-bold text-slate-700">Category
          <input name="category" defaultValue={defaults?.category} placeholder="Cybersecurity"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-slate-700">Author
          <input name="author" defaultValue={defaults?.author ?? "CYVRIX Editorial"}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
        <label className="block text-sm font-bold text-slate-700">Tags (comma-separated)
          <input name="tags" defaultValue={defaults?.tags} placeholder="MFA, Cloud, SME"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
      </div>
      <label className="block text-sm font-bold text-slate-700">Body (Markdown)
        <textarea name="body" rows={6} defaultValue={defaults?.body} placeholder="Full article content in Markdown format..."
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none resize-none" />
      </label>
      <div className="grid grid-cols-1 gap-3 pt-1 border-t border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">SEO</p>
        <label className="block text-sm font-bold text-slate-700">SEO Title
          <input name="seoTitle" defaultValue={defaults?.seoTitle}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
        <label className="block text-sm font-bold text-slate-700">SEO Description
          <input name="seoDescription" defaultValue={defaults?.seoDescription}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none" />
        </label>
      </div>
    </>
  );
}
