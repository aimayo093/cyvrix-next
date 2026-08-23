import * as React from "react";
import { Navbar } from "@/components/nav-main/Navbar";
import { Footer } from "@/components/nav-main/Footer";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { JsonLd } from "@/components/public/JsonLd";
import { getPublicShellData } from "@/lib/public-cache";
import { organisationSchema, webSiteSchema } from "@/lib/structured-data";

/**
 * Primary navigation is kept deliberately short. Careers, Case Studies and
 * Insights are reachable from the footer rather than the header, so the top
 * level stays focused on what a prospective client is looking for.
 */
const fallbackHeaderMenu = [
  { id: "fallback-home", label: "Home", url: "/", sortOrder: 10 },
  { id: "fallback-services", label: "Services", url: "/services", sortOrder: 20 },
  { id: "fallback-industries", label: "Industries", url: "/industries", sortOrder: 30 },
  { id: "fallback-about", label: "About", url: "/about", sortOrder: 40 },
  { id: "fallback-contact", label: "Contact", url: "/contact", sortOrder: 50 },
  {
    id: "fallback-cta",
    label: "Book a Free Review",
    url: "/book-consultation",
    sortOrder: 90,
    iconKey: "button-cta",
  },
];

/**
 * Header entries retired from the primary navigation. Filtered out even when the
 * CMS still supplies them. Pricing is reached through Managed Services instead.
 */
const headerExcludedPaths = new Set(["/careers", "/case-studies", "/blog", "/insights", "/pricing"]);

function withoutRetiredHeaderItems<T extends { url?: string | null }>(items: T[]): T[] {
  return items.filter((item) => {
    const url = (item.url ?? "").split("?")[0].replace(/\/$/, "");
    return url === "" || !headerExcludedPaths.has(url);
  });
}

/**
 * Header and footer navigation performs a full document load rather than a
 * client-side transition.
 *
 * With `cacheComponents` enabled, Next keeps the previous route mounted in a
 * hidden React <Activity> subtree so component state survives navigation. That
 * is good for app-like UIs, but on a content site it means a page can reappear
 * with its earlier state rather than freshly rendered. A full load guarantees
 * every page is rendered from scratch, at the cost of client-side navigation
 * speed.
 */
const FORCE_FULL_PAGE_RELOAD = true;

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
      {/* Emitted once for the whole public site; individual pages add their own
          page-level graphs (Service, FAQPage, BreadcrumbList) on top. */}
      <JsonLd schema={[organisationSchema(), webSiteSchema()]} />

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
    contactSettings,
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
        contactSettings: null,
        brandAssets: [],
        headerMenu: null,
        footerSections: [],
        socialLinks: [],
        complianceCards: [],
      };
    });

  const brandData = (brandSettings?.value as Record<string, string>) ?? {};
  const companyData = (companySettings?.value as Record<string, string>) ?? {};
  const contactData = (contactSettings?.value as Record<string, string>) ?? {};

  // Brand Assets in the CMS win; these defaults keep the correct logo variant on
  // each background so the header never falls back to the text placeholder.
  const brandLogo = {
    colour: "/brand/cyvrix-logo-color.png",
    white: "/brand/cyvrix-logo-white.png",
    black: "/brand/cyvrix-logo-black.png",
  } as const;

  const logoDefault = brandAssets.find((asset) => asset.assetKey === "logo_default")?.mediaUrl || brandData.logoUrl || brandLogo.colour;
  const logoWhite = brandAssets.find((asset) => asset.assetKey === "logo_white")?.mediaUrl || brandLogo.white;
  const logoDark = brandAssets.find((asset) => asset.assetKey === "logo_dark")?.mediaUrl || brandLogo.colour;
  const logoFooter = brandAssets.find((asset) => asset.assetKey === "logo_footer")?.mediaUrl || brandLogo.white;
  const logoSticky = brandAssets.find((asset) => asset.assetKey === "logo_sticky")?.mediaUrl || brandLogo.white;

  const logoAlt = brandData.logoAlt || "CYVRIX Technologies";
  const companyDesc = publicValue(brandData.footerDescription);
  const phone = publicValue(companyData.phone) ?? publicValue(contactData.phone);
  const email = publicValue(companyData.supportEmail) ?? publicValue(contactData.supportEmail);
  // The footer shows the town from companyFacts, and the full registered
  // office appears once in the statutory disclosure, so no CMS address is
  // resolved for the site chrome. /contact still renders hqAddress itself.
  const phoneHours = publicValue(contactData.phoneHours);
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
    phoneHours,
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
      navItems={
        headerMenu?.items?.length
          ? withoutRetiredHeaderItems(headerMenu.items)
          : fallbackHeaderMenu
      }
      logoDefault={logoDefault}
      logoWhite={logoWhite}
      logoDark={logoDark}
      logoSticky={logoSticky}
      logoAlt={logoAlt}
      phone={phone}
      email={email}
      forceFullPageReload={FORCE_FULL_PAGE_RELOAD}
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
    phoneHours,
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
      phoneHours={phoneHours}
      copyright={copyright}
      complianceCards={complianceCards}
      forceFullPageReload={FORCE_FULL_PAGE_RELOAD}
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
