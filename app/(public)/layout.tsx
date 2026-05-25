import * as React from "react";
import { Navbar } from "@/components/nav-main/Navbar";
import { Footer } from "@/components/nav-main/Footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch brand assets, menus, footer, social links, and site settings in parallel
  const [
    brandSettings,
    companySettings,
    brandAssets,
    headerMenu,
    footerSections,
    socialLinks,
    complianceCards,
  ] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "brand" } }),
    prisma.siteSetting.findUnique({ where: { key: "company" } }),
    prisma.brandAsset.findMany({ where: { isActive: true } }),
    prisma.menu.findUnique({
      where: { location: "header" },
      include: {
        items: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.footerSection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
      include: {
        links: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.socialLink.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.complianceCard.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Extract settings
  const brandData = (brandSettings?.value as Record<string, string>) ?? {};
  const companyData = (companySettings?.value as Record<string, string>) ?? {};

  // Extract brand assets (logos)
  const logoDefault = brandAssets.find((a) => a.assetKey === "logo_default")?.mediaUrl || brandData.logoUrl || "";
  const logoWhite = brandAssets.find((a) => a.assetKey === "logo_white")?.mediaUrl || "";
  const logoDark = brandAssets.find((a) => a.assetKey === "logo_dark")?.mediaUrl || "";
  const logoFooter = brandAssets.find((a) => a.assetKey === "logo_footer")?.mediaUrl || "";
  const logoSticky = brandAssets.find((a) => a.assetKey === "logo_sticky")?.mediaUrl || "";

  const logoAlt = brandData.logoAlt || "CYVRIX Technologies";
  const companyDesc = brandData.footerDescription || undefined;
  const phone = companyData.phone || "0800 123 4567";
  const email = companyData.supportEmail || "support@cyvrix.co.uk";
  const address = companyData.address || "UK service coverage";
  const copyright = companyData.copyright || `© ${new Date().getFullYear()} CYVRIX Technologies Ltd.`;

  return (
    <>
      <Navbar
        navItems={headerMenu?.items || []}
        logoDefault={logoDefault}
        logoWhite={logoWhite}
        logoDark={logoDark}
        logoSticky={logoSticky}
        logoAlt={logoAlt}
        phone={phone}
        email={email}
      />
      <main className="flex-1">{children}</main>
      <Footer
        footerSections={footerSections}
        socialLinks={socialLinks}
        logoUrl={logoFooter || logoDefault}
        logoAlt={logoAlt}
        companyDesc={companyDesc}
        phone={phone}
        email={email}
        address={address}
        copyright={copyright}
        complianceCards={complianceCards}
      />
    </>
  );
}
