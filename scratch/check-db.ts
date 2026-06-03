import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const page = await prisma.cmsPage.findUnique({
    where: { slug: "contact" },
    include: { sections: true }
  });
  console.log("Contact Page DB Entry:", JSON.stringify(page, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
