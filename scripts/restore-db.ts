import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const files = fs.readdirSync(uploadsDir);

  const colorLogos = files.filter(f => f.includes('Colorlogo-nobackground.png')).sort();
  const whiteLogos = files.filter(f => f.includes('Whitelogo-nobackground.png')).sort();
  const markusImages = files.filter(f => f.includes('markus-winkler-2YIShvIMMQc')).sort();

  const latestColorLogo = colorLogos.length > 0 ? `/uploads/${colorLogos[colorLogos.length - 1]}` : '';
  const latestWhiteLogo = whiteLogos.length > 0 ? `/uploads/${whiteLogos[whiteLogos.length - 1]}` : '';
  const heroBg = markusImages.length > 0 ? `/uploads/${markusImages[markusImages.length - 1]}` : '';

  if (latestColorLogo) {
    await prisma.brandAsset.updateMany({
      where: { assetKey: 'logo_default' },
      data: { mediaUrl: latestColorLogo }
    });
    console.log('Restored logo_default:', latestColorLogo);
  }

  if (latestWhiteLogo) {
    await prisma.brandAsset.updateMany({
      where: { assetKey: 'logo_white' },
      data: { mediaUrl: latestWhiteLogo }
    });
    console.log('Restored logo_white:', latestWhiteLogo);
  }

  // Update Page Section for Hero
  if (heroBg) {
    const homePage = await prisma.cmsPage.findUnique({ where: { slug: 'home' } });
    if (homePage) {
      const heroSection = await prisma.pageSection.findFirst({
        where: { pageId: homePage.id, sectionType: 'Hero' }
      });
      if (heroSection) {
        let settings = heroSection.settingsJson as any || {};
        settings.backgroundImage = heroBg;
        await prisma.pageSection.update({
          where: { id: heroSection.id },
          data: { settingsJson: settings }
        });
        console.log('Restored hero background:', heroBg);
      }
    }
  }

  console.log("Database update complete. The website on Vercel should now reflect these changes since it reads from the same Supabase database.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
