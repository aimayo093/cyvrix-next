import { prisma } from '../lib/prisma';
async function main() {
  const count = await prisma.mediaAsset.count();
  console.log(`Media assets in DB: ${count}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
