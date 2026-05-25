import crypto from "node:crypto";
import { services, industries, faqs, legalPages, blogPosts, caseStudies, testimonials } from "../lib/cyvrix-data";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@cyvrix.co.uk" },
    update: { role: "SUPER_ADMIN", active: true, updatedAt: new Date() },
    create: {
      id: crypto.randomUUID(),
      email: "admin@cyvrix.co.uk",
      name: "CYVRIX Super Admin",
      role: "SUPER_ADMIN",
      passwordHash: hashPassword("ChangeMeNow!2026"),
      updatedAt: new Date(),
    },
  });

  await prisma.siteSetting.upsert({
    where: { key: "company" },
    update: {
      value: {
        name: "CYVRIX Technologies",
        tradingName: "CYVRIX Technologies",
        websiteUrl: "https://www.cyvrix.co.uk",
        contactEmail: "support@cyvrix.co.uk",
        supportEmail: "support@cyvrix.co.uk",
        phone: "Set in admin settings",
        address: "UK service coverage configured in admin",
      },
      updatedAt: new Date(),
    },
    create: {
      key: "company",
      value: {
        name: "CYVRIX Technologies",
        tradingName: "CYVRIX Technologies",
        websiteUrl: "https://www.cyvrix.co.uk",
        contactEmail: "support@cyvrix.co.uk",
        supportEmail: "support@cyvrix.co.uk",
        phone: "Set in admin settings",
        address: "UK service coverage configured in admin",
      },
      updatedAt: new Date(),
    },
  });

  await prisma.siteSetting.upsert({
    where: { key: "brand" },
    update: { value: { navy: "#0f172a", slate: "#475569", blue: "#2563eb", softBlue: "#eff6ff" }, updatedAt: new Date() },
    create: { key: "brand", value: { navy: "#0f172a", slate: "#475569", blue: "#2563eb", softBlue: "#eff6ff" }, updatedAt: new Date() },
  });

  await prisma.cmsPage.upsert({
    where: { slug: "home" },
    update: {
      title: "Homepage",
      heroTitle: "Secure, dependable IT support for growing UK businesses",
      heroSubtitle: "Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner.",
      status: "PUBLISHED",
      visible: true,
      updatedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      title: "Homepage",
      slug: "home",
      heroTitle: "Secure, dependable IT support for growing UK businesses",
      heroSubtitle: "Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner.",
      seoTitle: "CYVRIX Technologies | Managed IT and Cybersecurity",
      seoDescription: "CYVRIX Technologies provides managed IT support, cybersecurity, cloud and infrastructure consultancy for UK businesses.",
      status: "PUBLISHED",
      visible: true,
      updatedAt: new Date(),
      ContentBlock: {
        create: [
          { id: crypto.randomUUID(), type: "SERVICE_CARDS", title: "Core services", sortOrder: 1, content: { limit: 4 }, updatedAt: new Date() },
          { id: crypto.randomUUID(), type: "TEXT", title: "Why CYVRIX", sortOrder: 2, content: { body: "Clear ownership, practical security, and reliable support without unnecessary complexity." }, updatedAt: new Date() },
          { id: crypto.randomUUID(), type: "CASE_STUDY_CARDS", title: "Proof points", sortOrder: 3, content: { limit: 2 }, updatedAt: new Date() },
          { id: crypto.randomUUID(), type: "CTA", title: "Book a consultation", sortOrder: 4, content: { href: "/request-quote", label: "Book a free consultation" }, updatedAt: new Date() },
        ],
      },
    },
  });

  for (const [index, service] of services.entries()) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {
        title: service.title,
        summary: service.summary,
        published: true,
        sortOrder: index,
        content: {
          includes: service.includes,
          audience: service.audience,
          problems: service.problems,
          features: service.features,
          process: service.process,
          compliance: service.compliance,
          faq: service.faqs,
        },
        updatedAt: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        slug: service.slug,
        title: service.title,
        summary: service.summary,
        published: true,
        sortOrder: index,
        content: {
          includes: service.includes,
          audience: service.audience,
          problems: service.problems,
          features: service.features,
          process: service.process,
          compliance: service.compliance,
          faq: service.faqs,
        },
        updatedAt: new Date(),
      },
    });
  }

  for (const [index, industry] of industries.entries()) {
    const industryContent = {
      challenges: industry.challenges,
      help: industry.help,
      solutions: industry.solutions,
      services: industry.services,
    };
    await prisma.industry.upsert({
      where: { slug: industry.slug },
      update: { title: industry.title, published: true, sortOrder: index, content: industryContent, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), slug: industry.slug, title: industry.title, published: true, sortOrder: index, content: industryContent, updatedAt: new Date() },
    });
  }

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: { id: crypto.randomUUID(), category: faq.category, question: faq.question, answer: faq.answer, published: true },
    }).catch(() => undefined);
  }

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, body: page.sections.join("\n\n"), status: "PUBLISHED", updatedAt: new Date() },
      create: { id: crypto.randomUUID(), slug: page.slug, title: page.title, body: page.sections.join("\n\n"), status: "PUBLISHED", updatedAt: new Date() },
    });
  }

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { title: post.title, category: post.category, author: post.author, tags: post.tags, status: "PUBLISHED", body: post.excerpt, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), slug: post.slug, title: post.title, category: post.category, author: post.author, tags: post.tags, status: "PUBLISHED", body: post.excerpt, updatedAt: new Date() },
    });
  }

  for (const study of caseStudies) {
    await prisma.caseStudy.upsert({
      where: { slug: study.slug },
      update: { title: study.title, clientType: study.clientType, challenge: study.challenge, solution: study.solution, outcome: study.outcome, technologies: study.technologies, services: study.services, timeline: study.timeline, testimonial: study.testimonial, published: true, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), slug: study.slug, title: study.title, clientType: study.clientType, challenge: study.challenge, solution: study.solution, outcome: study.outcome, technologies: study.technologies, services: study.services, timeline: study.timeline, testimonial: study.testimonial, published: true, updatedAt: new Date() },
    });
  }

  for (const item of testimonials) {
    await prisma.testimonial.create({
      data: { id: crypto.randomUUID(), clientName: item.name, company: item.company, quote: item.quote, rating: item.rating, approved: true, featured: true },
    }).catch(() => undefined);
  }

  // Seeding Brand Assets
  const brandAssets = [
    { key: "logo_default", name: "Primary Brand Logo", url: "", alt: "CYVRIX Technologies Logo", usage: "Light backgrounds, general usage" },
    { key: "logo_white", name: "White Monochrome Logo", url: "", alt: "CYVRIX White Logo", usage: "Dark or sticky scrolled backgrounds" },
    { key: "logo_dark", name: "Dark Navy Logo", url: "", alt: "CYVRIX Dark Logo", usage: "Sleek light backgrounds" },
    { key: "logo_icon", name: "Icon Logo", url: "", alt: "CYVRIX Brand Symbol", usage: "Favicon, collapsed menus" },
    { key: "favicon", name: "Favicon Asset", url: "", alt: "Favicon Icon", usage: "Browser tab icon" },
    { key: "logo_footer", name: "Footer Brand Logo", url: "", alt: "CYVRIX Footer Logo", usage: "Footer area" },
    { key: "logo_admin", name: "Admin Dashboard Logo", url: "", alt: "CYVRIX Admin Logo", usage: "Admin sidebar top header" },
    { key: "logo_mobile", name: "Mobile Menu Logo", url: "", alt: "CYVRIX Mobile Logo", usage: "Mobile navigation header" },
  ];

  for (const asset of brandAssets) {
    await prisma.brandAsset.upsert({
      where: { assetKey: asset.key },
      update: { name: asset.name, mediaUrl: asset.url, altText: asset.alt, usageContext: asset.usage },
      create: { id: crypto.randomUUID(), assetKey: asset.key, name: asset.name, mediaUrl: asset.url, altText: asset.alt, usageContext: asset.usage },
    });
  }

  // Seeding Social Links
  const socialLinks = [
    { platform: "LinkedIn", url: "https://linkedin.com/company/cyvrix", label: "LinkedIn Company Page", iconKey: "Linkedin", order: 1 },
    { platform: "X/Twitter", url: "https://x.com/cyvrix", label: "X profile", iconKey: "Twitter", order: 2 },
    { platform: "GitHub", url: "https://github.com/cyvrix", label: "GitHub repository", iconKey: "Github", order: 3 },
    { platform: "Email", url: "mailto:support@cyvrix.co.uk", label: "Send email", iconKey: "Mail", order: 4 },
  ];

  for (const social of socialLinks) {
    await prisma.socialLink.create({
      data: { id: crypto.randomUUID(), platform: social.platform, url: social.url, label: social.label, iconKey: social.iconKey, sortOrder: social.order },
    }).catch(() => undefined);
  }

  // Seeding Compliance Cards
  const complianceFrameworks = [
    { title: "ISO 27001", desc: "International standard for information security management systems (ISMS).", cat: "Security Management", icon: "Shield", status: "Framework followed", location: "homepage,services,about,compliance_page", order: 1 },
    { title: "Cyber Essentials Plus", desc: "UK government-backed scheme demonstrating robust technical cyber controls.", cat: "Technical Security", icon: "CheckCircle", status: "In progress", location: "homepage,services,cybersecurity,about,footer", order: 2 },
    { title: "UK GDPR & DPA 2018", desc: "Full alignment with data protection regulations for secure, compliant records.", cat: "Data Privacy", icon: "Lock", status: "Certified", location: "homepage,about,compliance_page", order: 3 },
    { title: "ITIL-aligned Support", desc: "Service delivery routines aligned with best practices in service management.", cat: "IT Service Management", icon: "Settings", status: "Framework followed", location: "services,about,compliance_page", order: 4 },
  ];

  for (const comp of complianceFrameworks) {
    await prisma.complianceCard.create({
      data: {
        id: crypto.randomUUID(),
        title: comp.title,
        description: comp.desc,
        category: comp.cat,
        iconKey: comp.icon,
        status: comp.status,
        displayLocation: comp.location,
        sortOrder: comp.order,
      },
    }).catch(() => undefined);
  }

  // Seeding Partner Logos
  const partners = [
    { name: "Microsoft Solutions Partner", category: "Vendor Partner", logo: "", alt: "Microsoft Solutions Partner", url: "https://microsoft.com", featured: true, order: 1 },
    { name: "CREST Security Certified", category: "Certification", logo: "", alt: "CREST Certified", url: "https://crest-approved.org", featured: true, order: 2 },
    { name: "AWS Advanced Partner", category: "Technology Partner", logo: "", alt: "AWS Advanced Partner", url: "https://aws.amazon.com", featured: true, order: 3 },
    { name: "Fortinet Certified Partner", category: "Security Partner", logo: "", alt: "Fortinet Security Partner", url: "https://fortinet.com", featured: false, order: 4 },
    { name: "Cisco Premier Integrator", category: "Vendor Partner", logo: "", alt: "Cisco Integrator", url: "https://cisco.com", featured: false, order: 5 },
  ];

  for (const part of partners) {
    await prisma.partnerLogo.create({
      data: {
        id: crypto.randomUUID(),
        name: part.name,
        category: part.category,
        logoUrl: part.logo,
        altText: part.alt,
        websiteUrl: part.url,
        isFeatured: part.featured,
        sortOrder: part.order,
      },
    }).catch(() => undefined);
  }

  // Seeding Trusted Logos
  const trustedBusinesses = [
    { name: "Meridian Logistics", logo: "", alt: "Meridian Logistics", url: "", featured: true, order: 1 },
    { name: "Hartwell Group", logo: "", alt: "Hartwell Group", url: "", featured: true, order: 2 },
    { name: "Pinnacle Finance", logo: "", alt: "Pinnacle Finance", url: "", featured: true, order: 3 },
    { name: "NorthBridge Law", logo: "", alt: "NorthBridge Law", url: "", featured: true, order: 4 },
    { name: "Apex Healthcare", logo: "", alt: "Apex Healthcare", url: "", featured: true, order: 5 },
  ];

  for (const logo of trustedBusinesses) {
    await prisma.trustedBusinessLogo.create({
      data: {
        id: crypto.randomUUID(),
        companyName: logo.name,
        logoUrl: logo.logo,
        altText: logo.alt,
        websiteUrl: logo.url,
        isFeatured: logo.featured,
        sortOrder: logo.order,
      },
    }).catch(() => undefined);
  }

  // Seeding Menus
  const headerMenu = await prisma.menu.upsert({
    where: { location: "header" },
    update: { name: "Main Header Navigation" },
    create: { id: crypto.randomUUID(), name: "Main Header Navigation", location: "header" },
  });

  const headerItems = [
    { label: "Home", url: "/", order: 1 },
    { label: "Services", url: "/services", order: 2 },
    { label: "Industries", url: "/industries", order: 3 },
    { label: "Case Studies", url: "/case-studies", order: 4 },
    { label: "About Us", url: "/about", order: 5 },
    { label: "Contact", url: "/contact", order: 6 },
    { label: "Get a Free IT Audit", url: "/book-consultation", order: 7, iconKey: "button-cta" },
  ];

  for (const item of headerItems) {
    await prisma.menuItem.create({
      data: {
        id: crypto.randomUUID(),
        menuId: headerMenu.id,
        label: item.label,
        url: item.url,
        sortOrder: item.order,
        iconKey: item.iconKey || null,
      },
    }).catch(() => undefined);
  }

  // Seeding Footer Column Menus
  const companyCol = await prisma.footerSection.create({
    data: { id: crypto.randomUUID(), title: "Company", sortOrder: 1 },
  }).catch((e) => ({ id: "company-fallback" }));

  const servicesCol = await prisma.footerSection.create({
    data: { id: crypto.randomUUID(), title: "Services", sortOrder: 2 },
  }).catch((e) => ({ id: "services-fallback" }));

  const supportCol = await prisma.footerSection.create({
    data: { id: crypto.randomUUID(), title: "Support", sortOrder: 3 },
  }).catch((e) => ({ id: "support-fallback" }));

  const legalCol = await prisma.footerSection.create({
    data: { id: crypto.randomUUID(), title: "Legal", sortOrder: 4 },
  }).catch((e) => ({ id: "legal-fallback" }));

  const footerLinks = [
    // Company Col
    { secId: companyCol.id, label: "About Us", url: "/about", order: 1 },
    { secId: companyCol.id, label: "Careers", url: "/careers", order: 2 },
    { secId: companyCol.id, label: "Contact", url: "/contact", order: 3 },
    // Services Col
    { secId: servicesCol.id, label: "Managed IT Support", url: "/services/managed-it-support", order: 1 },
    { secId: servicesCol.id, label: "Cybersecurity Services", url: "/services/cybersecurity-services", order: 2 },
    { secId: servicesCol.id, label: "Cloud Solutions", url: "/services/cloud-solutions", order: 3 },
    // Support Col
    { secId: supportCol.id, label: "Client Portal", url: "/login", order: 1 },
    { secId: supportCol.id, label: "Support Desk", url: "/support", order: 2 },
    { secId: supportCol.id, label: "FAQs", url: "/faq", order: 3 },
    // Legal Col
    { secId: legalCol.id, label: "Privacy Policy", url: "/privacy-policy", order: 1 },
    { secId: legalCol.id, label: "Terms of Service", url: "/terms", order: 2 },
    { secId: legalCol.id, label: "Cookie Policy", url: "/cookie-policy", order: 3 },
  ];

  for (const link of footerLinks) {
    if (link.secId) {
      await prisma.footerLink.create({
        data: {
          id: crypto.randomUUID(),
          footerSectionId: link.secId,
          label: link.label,
          url: link.url,
          sortOrder: link.order,
        },
      }).catch(() => undefined);
    }
  }

  // Seed Dynamic Page Sections for Home Page
  const homePage = await prisma.cmsPage.findUnique({
    where: { slug: "home" },
  });

  if (homePage) {
    const homeSections = [
      {
        type: "Hero",
        title: "Secure, dependable IT support for growing UK businesses",
        sub: "Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner.",
        btnLab: "Request an IT Audit",
        btnUrl: "/book-consultation",
        bg: "dark",
        layout: "left",
        order: 1,
      },
      {
        type: "Partner logos",
        title: "Accredited & Certified Partner",
        order: 2,
      },
      {
        type: "Service cards",
        title: "Comprehensive IT Solutions",
        sub: "From day-to-day helpdesk support to complex cloud migrations and robust cybersecurity defenses, we have the expertise to scale with you.",
        btnLab: "View All Services",
        btnUrl: "/services",
        bg: "dark",
        order: 3,
      },
      {
        type: "Image and text",
        title: "Your quiet partner in a noisy digital world.",
        sub: "Why Choose CYVRIX",
        body: "We believe that great IT should be invisible. When your infrastructure is robust, secure, and proactively managed, your team can focus entirely on driving your business forward.",
        btnLab: "Meet The Team",
        btnUrl: "/about",
        bg: "dark",
        layout: "left",
        order: 4,
        settings: {
          points: [
            "No generic fixes. We resolve the root cause of issues.",
            "Clear, jargon-free communication from local UK experts.",
            "Transparent reporting via your dedicated client portal.",
            "Security-first architecture in every deployment."
          ]
        }
      },
      {
        type: "Testimonials",
        title: "Client Success",
        sub: "What our clients say about partnering with CYVRIX",
        bg: "dark",
        order: 5,
      },
      {
        type: "Trusted logos",
        title: "Trusted By Leading UK Businesses",
        order: 6,
      },
      {
        type: "CTA section",
        title: "Secure your business future today.",
        body: "Speak to one of our technical architects for a no-obligation audit of your current IT infrastructure and security posture.",
        btnLab: "Request Free Audit",
        btnUrl: "/book-consultation",
        bg: "dark",
        order: 7,
      }
    ];

    for (const sec of homeSections) {
      await prisma.pageSection.create({
        data: {
          id: crypto.randomUUID(),
          pageId: homePage.id,
          sectionType: sec.type,
          title: sec.title,
          subtitle: sec.sub || null,
          body: sec.body || null,
          buttonLabel: sec.btnLab || null,
          buttonUrl: sec.btnUrl || null,
          backgroundStyle: sec.bg || "dark",
          layoutStyle: sec.layout || "left",
          sortOrder: sec.order,
          settingsJson: sec.settings || {},
        },
      }).catch(() => undefined);
    }
  }

  await prisma.auditLog.create({
    data: { id: crypto.randomUUID(), userId: admin.id, action: "seed_completed", entityType: "System", metadata: { warning: "Change the default admin password immediately." } },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
