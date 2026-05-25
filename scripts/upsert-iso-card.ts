import { prisma } from "../lib/prisma";

async function main() {
  const existing = await prisma.complianceCard.findFirst({
    where: {
      title: {
        contains: "27001",
        mode: "insensitive"
      }
    }
  });

  const cardData = {
    title: "ISO 27001",
    description: "Information security management framework for protecting data, systems, and business operations.",
    category: "Security Management",
    iconKey: "Shield",
    status: "Framework followed",
    displayLocation: "homepage,about,compliance_page,footer", // active in footer by default
    isVisible: true,
  };

  if (existing) {
    console.log("Updating existing ISO 27001 card...");
    await prisma.complianceCard.update({
      where: { id: existing.id },
      data: cardData
    });
  } else {
    console.log("Creating new ISO 27001 card...");
    await prisma.complianceCard.create({
      data: {
        id: crypto.randomUUID(),
        ...cardData,
        sortOrder: 1
      }
    });
  }
  console.log("Database update completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
