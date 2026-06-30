import * as React from "react";
import { Navbar } from "@/components/nav-main/Navbar";
import { Footer } from "@/components/nav-main/Footer";
import { getPublicShellData } from "@/lib/public-cache";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <React.Suspense fallback={<PublicNavbarFallback />}>
        <PublicNavbar />
      </React.Suspense>
      <main className="flex-1">{children}</main>
      <React.Suspense fallback={null}>
        <PublicFooter />
      </React.Suspense>
    </>
  );
}

async function getPublicChromeData() {
  const [
    brandSettings,
    companySettings,
    brandAssets,
    headerMenu,
    footerSections,
    socialLinks,
    complianceCards,
  ] = await getPublicShellData()
    .then((data) => [
      data.brandSettings,
      data.companySettings,
      data.brandAssets,
      data.headerMenu,
      data.footerSections,
      data.socialLinks,
      data.complianceCards,
    ] as const)
    .catch((error) => {
      console.error("[public-layout] failed to load cached shell data", error);
      return [null, null, [], null, [], [], []] as const;
    });

  const brandData = (brandSettings?.value as Record<string, string>) ?? {};
  const companyData = (companySettings?.value as Record<string, string>) ?? {};

  const logoDefault = brandAssets.find((asset) => asset.assetKey === "logo_default")?.mediaUrl || brandData.logoUrl || "";
  const logoWhite = brandAssets.find((asset) => asset.assetKey === "logo_white")?.mediaUrl || "";
  const logoDark = brandAssets.find((asset) => asset.assetKey === "logo_dark")?.mediaUrl || "";
  const logoFooter = brandAssets.find((asset) => asset.assetKey === "logo_footer")?.mediaUrl || "";
  const logoSticky = brandAssets.find((asset) => asset.assetKey === "logo_sticky")?.mediaUrl || "";

  const logoAlt = brandData.logoAlt || "CYVRIX Technologies";
  const companyDesc = brandData.footerDescription || undefined;
  const phone = companyData.phone || "0800 123 4567";
  const email = companyData.supportEmail || "support@cyvrix.co.uk";
  const address = companyData.address || "UK service coverage";
  const copyright = companyData.copyright || "CYVRIX Technologies Ltd. All rights reserved.";

  return {
    headerMenu,
    footerSections,
    socialLinks,
    complianceCards,
    logoDefault,
    logoWhite,
    logoDark,
    logoFooter,
    logoSticky,
    logoAlt,
    companyDesc,
    phone,
    email,
    address,
    copyright,
  };
}

async function PublicNavbar() {
  const {
    headerMenu,
    logoDefault,
    logoWhite,
    logoDark,
    logoSticky,
    logoAlt,
    phone,
    email,
  } = await getPublicChromeData();

  return (
    <Navbar
      navItems={headerMenu?.items || []}
      logoDefault={logoDefault}
      logoWhite={logoWhite}
      logoDark={logoDark}
      logoSticky={logoSticky}
      logoAlt={logoAlt}
      phone={phone}
      email={email}
      forceFullPageReload={false}
    />
  );
}

async function PublicFooter() {
  const {
    footerSections,
    socialLinks,
    logoDefault,
    logoFooter,
    logoAlt,
    companyDesc,
    phone,
    email,
    address,
    copyright,
    complianceCards,
  } = await getPublicChromeData();

  return (
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
      forceFullPageReload={false}
    />
  );
}

function PublicNavbarFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white py-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="h-10 w-36 rounded bg-slate-100" />
        <div className="hidden gap-6 lg:flex">
          <div className="h-4 w-20 rounded bg-slate-100" />
          <div className="h-4 w-20 rounded bg-slate-100" />
          <div className="h-4 w-20 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-40 rounded bg-slate-100" />
      </div>
    </header>
  );
}
