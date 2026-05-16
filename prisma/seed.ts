import { services, industries, faqs, legalPages, blogPosts, caseStudies, testimonials } from "../src/lib/cyvrix-data";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@cyvrix.co.uk" },
    update: { role: "SUPER_ADMIN", active: true },
    create: {
      email: "admin@cyvrix.co.uk",
      name: "CYVRIX Super Admin",
      role: "SUPER_ADMIN",
      passwordHash: hashPassword("ChangeMeNow!2026"),
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
    },
  });

  await prisma.siteSetting.upsert({
    where: { key: "brand" },
    update: { value: { navy: "#0f172a", slate: "#475569", blue: "#2563eb", softBlue: "#eff6ff" } },
    create: { key: "brand", value: { navy: "#0f172a", slate: "#475569", blue: "#2563eb", softBlue: "#eff6ff" } },
  });

  await prisma.cmsPage.upsert({
    where: { slug: "home" },
    update: {
      title: "Homepage",
      heroTitle: "Secure, dependable IT support for growing UK businesses",
      heroSubtitle: "Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner.",
      status: "PUBLISHED",
      visible: true,
    },
    create: {
      title: "Homepage",
      slug: "home",
      heroTitle: "Secure, dependable IT support for growing UK businesses",
      heroSubtitle: "Managed IT, cybersecurity, cloud and infrastructure consultancy from a calm technical partner.",
      seoTitle: "CYVRIX Technologies | Managed IT and Cybersecurity",
      seoDescription: "CYVRIX Technologies provides managed IT support, cybersecurity, cloud and infrastructure consultancy for UK businesses.",
      status: "PUBLISHED",
      visible: true,
      blocks: {
        create: [
          { type: "SERVICE_CARDS", title: "Core services", sortOrder: 1, content: { limit: 4 } },
          { type: "TEXT", title: "Why CYVRIX", sortOrder: 2, content: { body: "Clear ownership, practical security, and reliable support without unnecessary complexity." } },
          { type: "CASE_STUDY_CARDS", title: "Proof points", sortOrder: 3, content: { limit: 2 } },
          { type: "CTA", title: "Book a consultation", sortOrder: 4, content: { href: "/request-quote", label: "Book a free consultation" } },
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
      },
      create: {
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
      update: { title: industry.title, published: true, sortOrder: index, content: industryContent },
      create: { slug: industry.slug, title: industry.title, published: true, sortOrder: index, content: industryContent },
    });
  }

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: { category: faq.category, question: faq.question, answer: faq.answer, published: true },
    }).catch(() => undefined);
  }

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, body: page.sections.join("\n\n"), status: "PUBLISHED" },
      create: { slug: page.slug, title: page.title, body: page.sections.join("\n\n"), status: "PUBLISHED" },
    });
  }

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { title: post.title, category: post.category, author: post.author, tags: post.tags, status: "PUBLISHED", body: post.excerpt },
      create: { slug: post.slug, title: post.title, category: post.category, author: post.author, tags: post.tags, status: "PUBLISHED", body: post.excerpt },
    });
  }

  for (const study of caseStudies) {
    await prisma.caseStudy.upsert({
      where: { slug: study.slug },
      update: { title: study.title, clientType: study.clientType, challenge: study.challenge, solution: study.solution, outcome: study.outcome, technologies: study.technologies, services: study.services, timeline: study.timeline, testimonial: study.testimonial, published: true },
      create: { slug: study.slug, title: study.title, clientType: study.clientType, challenge: study.challenge, solution: study.solution, outcome: study.outcome, technologies: study.technologies, services: study.services, timeline: study.timeline, testimonial: study.testimonial, published: true },
    });
  }

  for (const item of testimonials) {
    await prisma.testimonial.create({
      data: { clientName: item.name, company: item.company, quote: item.quote, rating: item.rating, approved: true, featured: true },
    }).catch(() => undefined);
  }

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "seed_completed", entityType: "System", metadata: { warning: "Change the default admin password immediately." } },
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
