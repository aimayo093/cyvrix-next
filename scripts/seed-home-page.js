require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // Upsert the "home" CMS page with default client slider + page content
  const existing = await prisma.cmsPage.findUnique({ where: { slug: 'home' } });

  const defaultContent = {
    clients: [
      { name: "Meridian Logistics", industry: "Logistics" },
      { name: "Hartwell Group", industry: "Finance" },
      { name: "Pinnacle Finance", industry: "Banking" },
      { name: "NorthBridge Law", industry: "Legal" },
      { name: "Apex Healthcare", industry: "Healthcare" },
      { name: "Sterling Manufacturing", industry: "Manufacturing" },
      { name: "Elysian Retail", industry: "Retail" },
      { name: "Crestwood Consulting", industry: "Consulting" },
      { name: "BrightPath Education", industry: "Education" },
      { name: "OakField Properties", industry: "Real Estate" }
    ]
  };

  if (!existing) {
    await prisma.cmsPage.create({
      data: {
        id: 'home',
        slug: 'home',
        title: 'Homepage',
        heroTitle: 'Managed IT & Cybersecurity you can actually rely on.',
        heroSubtitle: 'We provide strategic IT support, proactive cybersecurity, and robust cloud infrastructure to empower your team and protect your critical data.',
        status: 'PUBLISHED',
        visible: true,
        updatedAt: new Date(),
        ContentBlock: {
          create: {
            id: 'home-content-block',
            type: 'FEATURE_GRID',
            content: defaultContent,
            visible: true,
            sortOrder: 0,
            updatedAt: new Date(),
          }
        }
      }
    });
    console.log('Home page seeded.');
  } else {
    // If content block doesn't exist, create it
    const block = await prisma.contentBlock.findFirst({ where: { pageId: existing.id } });
    if (!block) {
      await prisma.contentBlock.create({
        data: {
          id: 'home-content-block',
          pageId: existing.id,
          type: 'FEATURE_GRID',
          content: defaultContent,
          visible: true,
          sortOrder: 0,
          updatedAt: new Date(),
        }
      });
      console.log('Home content block seeded.');
    } else {
      // Merge clients into existing content
      const existingContent = block.content || {};
      const merged = { ...existingContent, ...defaultContent };
      await prisma.contentBlock.update({
        where: { id: block.id },
        data: { content: merged, updatedAt: new Date() }
      });
      console.log('Home content block updated with clients.');
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
