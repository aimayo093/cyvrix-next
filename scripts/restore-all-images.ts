import { prisma } from '../lib/prisma';

async function main() {
  console.log("Restoring specific Partner Logos...");
  const mappings = [
    { nameMatch: "Fortinet", url: "/uploads/1779682161819-281167433-partner-logo-fortinet.png" },
    { nameMatch: "Cisco", url: "/uploads/1779681760586-430666910-logo-cisco-systems-brand-font-portable-network-graphics-ibm-watson-animated-gif.jpg" },
    { nameMatch: "AWS", url: "/uploads/1779681549018-433615190-kisspng-amazon-web-services-amazon-com-cloud-computing-mic-server-5b10fadbaf6b18.2843485115278394517185.jpg" },
    { nameMatch: "CREST", url: "/uploads/1779680800084-186433730-logo-iso-iec-20000-iso-9000-trademark-iso-iec-27001-png-favpng-UKH1K9iRRt2GnXQwNwzprZkB4.jpg" } // Best guess for CREST/ISO
  ];

  const partners = await prisma.partnerLogo.findMany();
  for (const p of partners) {
    const map = mappings.find(m => p.name.includes(m.nameMatch));
    if (map) {
      await prisma.partnerLogo.update({
        where: { id: p.id },
        data: { logoUrl: map.url }
      });
      console.log(`Restored ${p.name} logo manually.`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
