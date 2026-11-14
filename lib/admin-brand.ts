import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";

export type AdminBrand = {
  /** Full logo for a light background. */
  logo: string;
  /** Square mark for the collapsed sidebar. */
  icon: string;
  alt: string;
};

/** The bundled logo files, used whenever Brand Assets has nothing to say. */
export const DEFAULT_ADMIN_BRAND: AdminBrand = {
  logo: "/brand/cyvrix-logo-color.png",
  icon: "/brand/cyvrix-icon.png",
  alt: "CYVRIX Technologies",
};

/**
 * The logo the admin sidebar shows, from Brand Assets.
 *
 * "Admin logo" (logo_admin) is the asset made for this place; until this
 * existed it was uploadable but never read. Without it the dark-on-light logo
 * is used, since the admin is light. The collapsed sidebar uses "Logo icon". Cached under the same tag a Brand Assets save refreshes,
 * so a new logo appears on the next page load. Any failure falls back to the
 * bundled files: a broken logo lookup must never cost the admin its chrome.
 */
/**
 * getAdminBrand, but never waited on for more than `ms`. The admin chrome waits
 * for the brand, so a slow or pool-starved query must not hold administrators
 * on a skeleton. The timeout lives outside the cached function, so a fallback
 * is shown once and never cached for hours.
 */
export async function getAdminBrandWithin(ms = 1500): Promise<AdminBrand> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<AdminBrand>((resolve) => {
    timer = setTimeout(() => resolve(DEFAULT_ADMIN_BRAND), ms);
  });
  try {
    return await Promise.race([getAdminBrand().catch(() => DEFAULT_ADMIN_BRAND), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getAdminBrand(): Promise<AdminBrand> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.brandAssets, PUBLIC_CACHE_TAGS.shell);

  try {
    const [assets, brandSetting] = await Promise.all([
      prisma.brandAsset.findMany({
        where: { isActive: true, assetKey: { in: ["logo_admin", "logo_dark", "logo_default", "logo_icon", "favicon"] } },
        select: { assetKey: true, mediaUrl: true, altText: true },
      }),
      prisma.siteSetting.findUnique({ where: { key: "brand" } }),
    ]);
    const url = (key: string) => assets.find((asset) => asset.assetKey === key)?.mediaUrl?.trim() || "";
    const alt = (key: string) => assets.find((asset) => asset.assetKey === key)?.altText?.trim() || "";
    const brand = (brandSetting?.value ?? {}) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    return {
      logo: url("logo_admin") || url("logo_dark") || url("logo_default") || text(brand.logoUrl) || DEFAULT_ADMIN_BRAND.logo,
      icon: url("logo_icon") || url("favicon") || DEFAULT_ADMIN_BRAND.icon,
      // The admin logo's own alt text wins, so editing it in Brand Assets
      // changes the sidebar's accessible name.
      alt: (url("logo_admin") && alt("logo_admin")) || text(brand.logoAlt) || DEFAULT_ADMIN_BRAND.alt,
    };
  } catch (error) {
    console.warn("[admin-brand] could not load brand assets; using the bundled logo", error);
    return DEFAULT_ADMIN_BRAND;
  }
}
