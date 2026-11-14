/**
 * The admin sidebar, grouped by job rather than by data model.
 *
 * Every admin page appears exactly once; `npm run test:dashboard` fails if a
 * page under app/admin has no entry here. Icons are lucide names, resolved in
 * components/admin/AdminSidebar.tsx, so this file stays importable by tests.
 */

export type AdminNavIcon =
  | "today"
  | "inbox"
  | "ticket"
  | "building"
  | "survey"
  | "mail"
  | "pages"
  | "home"
  | "blog"
  | "drafts"
  | "services"
  | "navigation"
  | "footer"
  | "brand"
  | "image"
  | "social"
  | "partner"
  | "trusted"
  | "compliance"
  | "product"
  | "industry"
  | "faq"
  | "legal"
  | "careers"
  | "contact"
  | "testimonial"
  | "shield"
  | "audit"
  | "status"
  | "profile"
  | "settings";

export type AdminNavItem = {
  name: string;
  href: string;
  icon: AdminNavIcon;
  badge?: "enquiries" | "tickets" | "drafts";
};

export type AdminNavGroup = {
  group: "Work" | "Website" | "Security" | "Account";
  primary: AdminNavItem[];
  more?: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    group: "Work",
    primary: [
      { name: "Today", href: "/admin", icon: "today" },
      { name: "Enquiries", href: "/admin/leads-crm", icon: "inbox", badge: "enquiries" },
      { name: "Tickets", href: "/admin/ticket-management", icon: "ticket", badge: "tickets" },
      { name: "Clients", href: "/admin/client-management", icon: "building" },
      { name: "Surveys", href: "/admin/surveys", icon: "survey" },
      { name: "Email", href: "/admin/email", icon: "mail" },
    ],
  },
  {
    group: "Website",
    primary: [
      { name: "Pages", href: "/admin/pages-cms", icon: "pages" },
      { name: "Home page", href: "/admin/home-cms", icon: "home" },
      { name: "Blog", href: "/admin/blog-and-insights", icon: "blog" },
      { name: "AI drafts", href: "/admin/ai-drafts", icon: "drafts", badge: "drafts" },
      { name: "Services", href: "/admin/services-cms", icon: "services" },
      { name: "Navigation", href: "/admin/navigation", icon: "navigation" },
    ],
    more: [
      { name: "Footer", href: "/admin/footer-builder", icon: "footer" },
      { name: "Brand assets", href: "/admin/brand-assets", icon: "brand" },
      { name: "Site images", href: "/admin/site-images", icon: "image" },
      { name: "Social links", href: "/admin/social-links", icon: "social" },
      { name: "Partner logos", href: "/admin/partner-logos", icon: "partner" },
      { name: "Trusted logos", href: "/admin/trusted-logos", icon: "trusted" },
      { name: "Compliance cards", href: "/admin/compliance-cards", icon: "compliance" },
      { name: "Service products", href: "/admin/service-products", icon: "product" },
      { name: "Industries", href: "/admin/industries-cms", icon: "industry" },
      { name: "FAQs", href: "/admin/faqs", icon: "faq" },
      { name: "Legal pages", href: "/admin/legal-pages", icon: "legal" },
      { name: "Careers", href: "/admin/careers", icon: "careers" },
      { name: "Contact page", href: "/admin/contact-cms", icon: "contact" },
      { name: "Testimonials", href: "/admin/testimonials", icon: "testimonial" },
    ],
  },
  {
    group: "Security",
    primary: [
      { name: "Security Centre", href: "/admin/security-center", icon: "shield" },
      { name: "Audit log", href: "/admin/audit-logs", icon: "audit" },
      { name: "Status", href: "/admin/status", icon: "status" },
    ],
  },
  {
    group: "Account",
    primary: [
      { name: "Profile", href: "/admin/profile", icon: "profile" },
      { name: "Settings", href: "/admin/settings", icon: "settings" },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => [...group.primary, ...(group.more ?? [])]);

/** The nav item for a path: exact match, else the longest matching section. `/admin` matches only itself. */
export function activeNavItem(pathname: string): AdminNavItem | null {
  const exact = ALL_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;
  const prefixed = ALL_ITEMS.filter((item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
  return prefixed.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/** True when the item lives under the Website group's "More" list. */
export function isInMore(href: string): boolean {
  return ADMIN_NAV.some((group) => group.more?.some((item) => item.href === href));
}
