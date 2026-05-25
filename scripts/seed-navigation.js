require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // Clear existing to avoid duplicates if re-run
  await prisma.navigationItem.deleteMany({});

  const headerLinks = [
    { label: 'Home', href: '/', sortOrder: 0 },
    { label: 'Services', href: '/services', sortOrder: 1 },
    { label: 'Industries', href: '/industries', sortOrder: 2 },
    { label: 'Case Studies', href: '/case-studies', sortOrder: 3 },
    { label: 'Company', href: '/about', sortOrder: 4 },
    { label: 'Contact', href: '/contact', sortOrder: 5 },
  ];

  const footerLinks = [
    { label: 'Services', href: '/services', sortOrder: 0 },
    { label: 'Industries', href: '/industries', sortOrder: 1 },
    { label: 'Company', href: '/about', sortOrder: 2 },
    { label: 'Contact', href: '/contact', sortOrder: 3 },
    { label: 'Privacy Policy', href: '/privacy-policy', sortOrder: 4 },
    { label: 'Terms of Service', href: '/terms', sortOrder: 5 },
  ];

  for (const link of headerLinks) {
    await prisma.navigationItem.create({
      data: {
        id: `header-${link.label.toLowerCase().replace(/\s+/g, '-')}`,
        label: link.label,
        href: link.href,
        parentId: 'header',
        sortOrder: link.sortOrder,
        visible: true,
      }
    });
  }

  for (const link of footerLinks) {
    await prisma.navigationItem.create({
      data: {
        id: `footer-${link.label.toLowerCase().replace(/\s+/g, '-')}`,
        label: link.label,
        href: link.href,
        parentId: 'footer',
        sortOrder: link.sortOrder,
        visible: true,
      }
    });
  }

  console.log('Navigation seeded.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
