import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: "faq" },
    include: { sections: true }
  });
  console.log("FAQ Page DB Entry:", JSON.stringify(page, null, 2));

  const faqs = await prisma.fAQ.findMany();
  console.log("Total FAQs in DB:", faqs.length);
  console.log("FAQs:", JSON.stringify(faqs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
