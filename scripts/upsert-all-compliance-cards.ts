import { prisma } from "../lib/prisma";

async function main() {
  const cards = [
    {
      title: "ISO 27001",
      description: "Information security management framework for protecting data, systems, and business operations.",
      category: "Information Security",
      iconKey: "shield-check",
      status: "Framework aligned",
      displayLocation: "homepage,about,compliance_page,footer",
      isVisible: true,
      sortOrder: 1,
    },
    {
      title: "Cyber Essentials Plus",
      description: "Supports stronger protection against common cyber threats through tested controls covering firewalls, secure configuration, access control, malware protection, and patch management.",
      category: "Cybersecurity Assurance",
      iconKey: "shield-check",
      status: "Advisory service",
      displayLocation: "homepage,about,compliance_page,footer",
      isVisible: true,
      sortOrder: 2,
    },
    {
      title: "UK GDPR & DPA 2018",
      description: "Helps organisations handle personal data responsibly through privacy-aware processes, secure access controls, retention practices, and data protection support aligned with UK legal expectations.",
      category: "Data Protection",
      iconKey: "lock-keyhole",
      status: "Compliance support",
      displayLocation: "homepage,about,compliance_page,footer",
      isVisible: true,
      sortOrder: 3,
    },
    {
      title: "ITIL-aligned Support",
      description: "Supports professional IT service delivery through clear incident handling, service requests, escalation processes, change control, communication, and continual service improvement.",
      category: "IT Service Management",
      iconKey: "life-buoy",
      status: "Service aligned",
      displayLocation: "homepage,about,compliance_page,footer",
      isVisible: true,
      sortOrder: 4,
    },
  ];

  for (const card of cards) {
    const existing = await prisma.complianceCard.findFirst({
      where: {
        title: {
          equals: card.title,
          mode: "insensitive"
        }
      }
    });

    if (existing) {
      console.log(`Updating existing card: ${card.title}...`);
      await prisma.complianceCard.update({
        where: { id: existing.id },
        data: {
          title: card.title,
          description: card.description,
          category: card.category,
          iconKey: card.iconKey,
          status: card.status,
          displayLocation: card.displayLocation,
          isVisible: card.isVisible,
          sortOrder: card.sortOrder,
        }
      });
    } else {
      console.log(`Creating new card: ${card.title}...`);
      await prisma.complianceCard.create({
        data: {
          id: crypto.randomUUID(),
          ...card,
        }
      });
    }
  }

  console.log("Compliance cards database seeding/sync completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
