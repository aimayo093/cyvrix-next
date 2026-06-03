import crypto from "node:crypto";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding CMS public pages and sections...");

  // ─── ABOUT PAGE ────────────────────────────────────────────────────────────
  const aboutPage = await prisma.cmsPage.upsert({
    where: { slug: "about" },
    update: {
      title: "About Us",
      heroTitle: "Clarity in a Complex Digital Landscape.",
      heroSubtitle: "CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.",
      status: "PUBLISHED",
      visible: true,
      updatedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      title: "About Us",
      slug: "about",
      heroTitle: "Clarity in a Complex Digital Landscape.",
      heroSubtitle: "CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.",
      seoTitle: "About CYVRIX | Premium IT Consultancy",
      seoDescription: "CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.",
      status: "PUBLISHED",
      visible: true,
      updatedAt: new Date(),
    },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: aboutPage.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        pageId: aboutPage.id,
        sectionType: "Hero",
        title: "Clarity in a Complex Digital Landscape.",
        subtitle: "Our Identity & Mission",
        body: "CYVRIX Technologies is a premium IT consultancy for organisations that need technology to be reliable, secure, and understandable.",
        buttonLabel: "Explore Our Services",
        buttonUrl: "/services",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        pageId: aboutPage.id,
        sectionType: "Feature cards",
        title: "Our Core Pillars",
        subtitle: "Strategic Foundations",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 2,
        settingsJson: {
          features: [
            { title: "Mission", icon: "Target", description: "Reduce IT risk and operational friction for growing UK organisations through dependable support, secure systems, and commercially grounded consultancy." },
            { title: "Vision", icon: "Globe", description: "To become the trusted technology partner for ambitious businesses that want enterprise-grade IT maturity without losing agility." },
            { title: "Values", icon: "Shield", description: "Clarity, security, ownership, and practical improvement. We avoid jargon and focus on outcomes that move the needle for your business." }
          ]
        },
      },
      {
        id: crypto.randomUUID(),
        pageId: aboutPage.id,
        sectionType: "Image and text",
        title: "Senior thinking without unnecessary complexity.",
        subtitle: "Why Choose CYVRIX",
        body: "CYVRIX is designed for leaders who want a partner that can operate support, advise on risk, and deliver transformation work. Our model is built around practical engineering and service discipline.",
        backgroundStyle: "brand",
        layoutStyle: "left",
        sortOrder: 3,
        settingsJson: {
          points: [
            "UK-focused support and consultancy model",
            "Security and compliance considered in every service",
            "Direct access to technical leadership",
            "Clear, predictable service level agreements",
            "Practical focus on business uptime and security"
          ]
        },
      },
      {
        id: crypto.randomUUID(),
        pageId: aboutPage.id,
        sectionType: "Statistics",
        title: "Our Numbers",
        backgroundStyle: "dark",
        sortOrder: 4,
        settingsJson: {
          stats: [
            { label: "UK Service", value: "100%", detail: "Fully local coverage" },
            { label: "SLA Adherence", value: "99.8%", detail: "On-time support delivery" },
            { label: "Response Time", value: "<15m", detail: "For priority events" },
            { label: "Client Rating", value: "4.9/5", detail: "Consistent excellence" }
          ]
        },
      },
      {
        id: crypto.randomUUID(),
        pageId: aboutPage.id,
        sectionType: "CTA section",
        title: "Ready to start your journey with CYVRIX?",
        buttonLabel: "Book a Consultation",
        buttonUrl: "/book-consultation",
        backgroundStyle: "dark",
        sortOrder: 5,
        settingsJson: {
          secondaryBtnLabel: "Explore Services",
          secondaryBtnUrl: "/services"
        },
      },
    ],
  });

  // ─── CAREERS PAGE ──────────────────────────────────────────────────────────
  const careersPage = await prisma.cmsPage.upsert({
    where: { slug: "careers" },
    update: { title: "Careers", status: "PUBLISHED", visible: true, updatedAt: new Date() },
    create: { id: crypto.randomUUID(), title: "Careers", slug: "careers", status: "PUBLISHED", visible: true, updatedAt: new Date() },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: careersPage.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        pageId: careersPage.id,
        sectionType: "Hero",
        title: "Build the future of secure IT.",
        subtitle: "Join the CYVRIX Team",
        body: "Work alongside premier technical architects delivering high-performing, secure cloud infrastructure and managed IT support across the UK.",
        buttonLabel: "View Openings",
        buttonUrl: "#openings",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        pageId: careersPage.id,
        sectionType: "Feature cards",
        title: "Why build your career at CYVRIX?",
        subtitle: "Benefits & Perks",
        backgroundStyle: "dark",
        sortOrder: 2,
        settingsJson: {
          features: [
            { title: "Remote-First", icon: "Globe", description: "Enjoy hybrid or fully remote schedules structured around clear deliverables rather than rigid office hours." },
            { title: "Premium Hardware", icon: "Laptop", description: "Receive top-spec Apple or Lenovo workstation equipment configured to your preferences." },
            { title: "Training Budget", icon: "Shield", description: "Direct annual allowance for technical certifications, AWS, Microsoft, CREST, or information security qualifications." }
          ]
        },
      },
      {
        id: crypto.randomUUID(),
        pageId: careersPage.id,
        sectionType: "Career openings",
        title: "Active Opportunities",
        body: "Join our calm, remote-first team of specialized architects and engineers.",
        backgroundStyle: "dark",
        sortOrder: 3,
      },
      {
        id: crypto.randomUUID(),
        pageId: careersPage.id,
        sectionType: "Contact section",
        title: "Apply for a future opening",
        body: "Submit your details and CV here. Our recruitment desk will align you with planned engineering and operations slots.",
        backgroundStyle: "dark",
        sortOrder: 4,
      },
    ],
  });

  // ─── CONTACT PAGE ──────────────────────────────────────────────────────────
  const contactPage = await prisma.cmsPage.upsert({
    where: { slug: "contact" },
    update: { title: "Contact", status: "PUBLISHED", visible: true, updatedAt: new Date() },
    create: { id: crypto.randomUUID(), title: "Contact", slug: "contact", status: "PUBLISHED", visible: true, updatedAt: new Date() },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: contactPage.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        pageId: contactPage.id,
        sectionType: "Hero",
        title: "Let's align your technology with your ambitions.",
        subtitle: "Get In Touch",
        body: "Have a general enquiry, support request, or project specification? Submit details below for a prompt, calm technical response.",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        pageId: contactPage.id,
        sectionType: "Contact section",
        title: "Secure Enquiry Form",
        body: "We respond to all verified enquiries within 1 business day.",
        backgroundStyle: "dark",
        sortOrder: 2,
      },
      {
        id: crypto.randomUUID(),
        pageId: contactPage.id,
        sectionType: "Feature cards",
        title: "Other channels",
        subtitle: "Direct Contact",
        backgroundStyle: "dark",
        sortOrder: 3,
        settingsJson: {
          features: [
            { title: "Email Support", icon: "Mail", description: "support@cyvrix.co.uk" },
            { title: "Call Hotline", icon: "Phone", description: "0800 123 4567" },
            { title: "Operations Hub", icon: "Monitor", description: "Remote-first coverage across the UK" }
          ]
        },
      },
    ],
  });

  // ─── FAQ PAGE ──────────────────────────────────────────────────────────────
  const faqPage = await prisma.cmsPage.upsert({
    where: { slug: "faq" },
    update: { title: "FAQ", status: "PUBLISHED", visible: true, updatedAt: new Date() },
    create: { id: crypto.randomUUID(), title: "FAQ", slug: "faq", status: "PUBLISHED", visible: true, updatedAt: new Date() },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: faqPage.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        pageId: faqPage.id,
        sectionType: "Hero",
        title: "Clear answers to your technical questions.",
        subtitle: "Frequently Asked Questions",
        body: "Have questions about terms, onboarding, hardware support, cloud migration, or security protocols? Find quick answers here.",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        pageId: faqPage.id,
        sectionType: "FAQ preview",
        title: "All Questions",
        backgroundStyle: "dark",
        sortOrder: 2,
      },
    ],
  });

  // ─── PRICING PAGE ──────────────────────────────────────────────────────────
  const pricingPage = await prisma.cmsPage.upsert({
    where: { slug: "pricing" },
    update: { title: "Pricing", status: "PUBLISHED", visible: true, updatedAt: new Date() },
    create: { id: crypto.randomUUID(), title: "Pricing", slug: "pricing", status: "PUBLISHED", visible: true, updatedAt: new Date() },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: pricingPage.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        pageId: pricingPage.id,
        sectionType: "Hero",
        title: "Pragmatic, predictable pricing packages.",
        subtitle: "Service Packages & Pricing",
        body: "Flexible options structured around users, servers, and SLA support scopes without locked-in supplier contracts.",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        pageId: pricingPage.id,
        sectionType: "Pricing cards",
        title: "Explore Our Plans",
        backgroundStyle: "dark",
        sortOrder: 2,
      },
    ],
  });

  // ─── SUPPORT PAGE ──────────────────────────────────────────────────────────
  const supportPage = await prisma.cmsPage.upsert({
    where: { slug: "support" },
    update: { title: "Support", status: "PUBLISHED", visible: true, updatedAt: new Date() },
    create: { id: crypto.randomUUID(), title: "Support", slug: "support", status: "PUBLISHED", visible: true, updatedAt: new Date() },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: supportPage.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        pageId: supportPage.id,
        sectionType: "Hero",
        title: "Technical Support & Outage Queue",
        subtitle: "Helpdesk Support",
        body: "Submit a support ticket directly below. CYVRIX engineers triage submissions in real-time according to contracted SLAs.",
        backgroundStyle: "dark",
        layoutStyle: "center",
        sortOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        pageId: supportPage.id,
        sectionType: "Contact section",
        title: "Open a Support Ticket",
        body: "Provide accurate details for fast remediation.",
        backgroundStyle: "dark",
        sortOrder: 2,
      },
    ],
  });

  console.log("CMS public pages successfully seeded!");
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
