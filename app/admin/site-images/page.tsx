import * as React from "react";
import { connection } from "next/server";
import Image from "next/image";
import { AlertCircle, CheckCircle2, ImageIcon, Save } from "lucide-react";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSiteImages } from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { readStoredImage, siteImageSections, siteImageSlots } from "@/lib/site-image-slots";

export const metadata = { title: "Site Images" };

type SiteImagesPageProps = {
  searchParams: Promise<{ status?: string; message?: string }>;
};

export default function SiteImagesPage(props: SiteImagesPageProps) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <SiteImagesContent {...props} />
    </React.Suspense>
  );
}

async function SiteImagesContent({ searchParams }: SiteImagesPageProps) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;

  const setting = await prisma.siteSetting
    .findUnique({ where: { key: "site_images" } })
    .catch(() => null);

  const stored = setting?.value ?? {};
  const replaced = siteImageSlots.filter((slot) => readStoredImage(stored, slot.field)).length;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-outfit text-3xl font-black text-[#041635]">
            <ImageIcon className="h-8 w-8 text-[#2691F0]" />
            Site Images
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
            Every hero image on the public site. Upload a replacement for any of them, or leave a slot
            empty to keep the reviewed default. {replaced} of {siteImageSlots.length} currently replaced.
          </p>
        </div>
      </div>

      {sp.status && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            sp.status === "success"
              ? "border-emerald-250 bg-emerald-50 text-emerald-800"
              : "border-rose-250 bg-rose-50 text-rose-800"
          }`}
        >
          {sp.status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div>
            <h2 className="text-sm font-black">{sp.status === "success" ? "Saved" : "Could not save"}</h2>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed">{sp.message}</p>
          </div>
        </div>
      )}

      {/*
        One form for every slot. The action drops empty fields rather than
        storing blanks, so clearing an upload restores the reviewed default
        instead of leaving that page with no image.
      */}
      <form action={updateSiteImages} className="space-y-8">
        {siteImageSections.map((section) => (
          <section key={section.group} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="font-outfit font-black text-slate-800">{section.title}</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">{section.description}</p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
              {section.slots.map((slot) => {
                const current = readStoredImage(stored, slot.field);
                return (
                  <div key={slot.field} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-outfit text-sm font-black text-[#041635]">{slot.label}</p>
                      {current ? (
                        <span className="shrink-0 rounded-md bg-[#2691F0]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0f5aab]">
                          Replaced
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Default
                        </span>
                      )}
                    </div>
                    <code className="mt-1 block truncate font-mono text-[10px] text-slate-400">
                      {slot.appearsOn}
                    </code>

                    {/* What this page shows today, so a replacement is not chosen blind. */}
                    {!current && slot.defaultImage && (
                      <div className="relative mt-3 h-24 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <Image
                          src={slot.defaultImage}
                          alt={`Current default for ${slot.label}`}
                          fill
                          sizes="(min-width: 1280px) 260px, (min-width: 768px) 40vw, 90vw"
                          className="object-cover"
                        />
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          Reviewed default
                        </span>
                      </div>
                    )}

                    <ImageUpload name={slot.field} defaultValue={current} className="mt-3" />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" variant="premium" className="h-auto px-6 py-3 text-sm shadow-lg">
            <Save className="h-4 w-4" />
            Save all images
          </Button>
        </div>
      </form>
    </div>
  );
}
