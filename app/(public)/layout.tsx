import * as React from "react";
import { Navbar } from "@/components/nav-main/Navbar";
import { Footer } from "@/components/nav-main/Footer";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { getPublicShellData } from "@/lib/public-cache";

const fallbackHeaderMenu = [
  { id: "fallback-home", label: "Home", url: "/", sortOrder: 10 },
  { id: "fallback-services", label: "Services", url: "/services", sortOrder: 20 },
  { id: "fallback-industries", label: "Industries", url: "/industries", sortOrder: 30 },
  { id: "fallback-about", label: "About", url: "/about", sortOrder: 40 },
  { id: "fallback-insights", label: "Insights", url: "/blog", sortOrder: 50 },
  { id: "fallback-case-studies", label: "Case Studies", url: "/case-studies", sortOrder: 60 },
  { id: "fallback-careers", label: "Careers", url: "/careers", sortOrder: 70 },
  { id: "fallback-contact", label: "Contact", url: "/contact", sortOrder: 80 },
  {
    id: "fallback-cta",
    label: "Book a Free Review",
    url: "/book-consultation",
    sortOrder: 90,
    iconKey: "button-cta",
  },
];

function publicValue(value?: string) {
  if (!value || /set in admin|configured in admin|placeholder/i.test(value)) return undefined;
  return value;
}

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
      <CookieConsent />
    </>
  );
}

async function getPublicChromeData() {
  const {
    brandSettings,
    companySettings,
    brandAssets,
    headerMenu,
    footerSections,
    socialLinks,
    complianceCards,
  } = await getPublicShellData()
    .catch((error) => {
      console.error("[public-layout] failed to load cached shell data", error);
      return {
        brandSettings: null,
        companySettings: null,
        brandAssets: [],
        headerMenu: null,
        footerSections: [],
        socialLinks: [],
        complianceCards: [],
      };
    });

  const brandData = (brandSettings?.value as Record<string, string>) ?? {};
  const companyData = (companySettings?.value as Record<string, string>) ?? {};

  const logoDefault = brandAssets.find((asset) => asset.assetKey === "logo_default")?.mediaUrl || brandData.logoUrl || "";
  const logoWhite = brandAssets.find((asset) => asset.assetKey === "logo_white")?.mediaUrl || "";
  const logoDark = brandAssets.find((asset) => asset.assetKey === "logo_dark")?.mediaUrl || "";
  const logoFooter = brandAssets.find((asset) => asset.assetKey === "logo_footer")?.mediaUrl || "";
  const logoSticky = brandAssets.find((asset) => asset.assetKey === "logo_sticky")?.mediaUrl || "";

  const logoAlt = brandData.logoAlt || "CYVRIX Technologies";
  const companyDesc = publicValue(brandData.footerDescription);
  const phone = publicValue(companyData.phone);
  const email = publicValue(companyData.supportEmail);
  const address = publicValue(companyData.address);
  const copyright = publicValue(companyData.copyright);

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
      navItems={headerMenu?.items?.length ? headerMenu.items : fallbackHeaderMenu}
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
