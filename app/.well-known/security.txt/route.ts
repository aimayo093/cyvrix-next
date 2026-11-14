import { cacheLife, cacheTag } from "next/cache";
import { companyFacts } from "@/lib/company-facts";
import { publicContactValue } from "@/lib/contact-settings";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { buildSecurityTxt } from "@/lib/security-txt";
import { SITE_URL } from "@/lib/structured-data";

/**
 * The support address set in Contact Us CMS comes first, because that inbox
 * is the one somebody reads. The published DPO address is the fallback so the
 * file always names someone.
 */
async function securityTxt(): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_CACHE_TAGS.contactSettings);

  let supportEmail = "";
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "contact_settings" } });
    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      supportEmail = publicContactValue((value as Record<string, unknown>).supportEmail);
    }
  } catch (error) {
    console.warn("[security.txt] could not read contact settings", error);
  }

  return buildSecurityTxt({
    contacts: [supportEmail, companyFacts.dataProtectionOfficerEmail],
    siteUrl: SITE_URL,
    now: new Date(),
  });
}

export async function GET() {
  const body = await securityTxt();
  if (!body) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
