import { PrismaClient } from "../generated/prisma";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const faqsToInsert = [
  {
    category: "General",
    question: "What is your typical response time for general inquiries?",
    answer: "Our typical response time for general inquiries via this contact form is under 1 business hour. For existing clients on managed support, critical SLA tickets are responded to in under 15 minutes.",
  },
  {
    category: "General",
    question: "Do you support businesses outside the UK?",
    answer: "While our core operations, engineers, and secure vaults are UK-based, we provide comprehensive remote support and engineering services for international branches of UK firms and partner companies globally.",
  },
  {
    category: "General",
    question: "Can we request an on-site visit for IT audits?",
    answer: "Absolutely. We schedule structured IT audits, network architecture reviews, and cybersecurity posture reviews on-site at your offices. Please outline your location details in the message box.",
  },
  {
    category: "General",
    question: "Do you offer custom SLA support agreements?",
    answer: "Yes. Every contract we construct can be custom-fitted with custom support scopes, dedicated virtual CIO advisory, custom coverage hours (including 24/7/365 operational monitoring), and distinct escalation rules.",
  },
];

async function main() {
  console.log("Starting FAQ database upsert...");
  for (const item of faqsToInsert) {
    // Check if it already exists
    const existing = await prisma.fAQ.findFirst({
      where: { question: item.question }
    });

    if (existing) {
      await prisma.fAQ.update({
        where: { id: existing.id },
        data: {
          answer: item.answer,
          category: item.category,
          published: true
        }
      });
      console.log(`Updated FAQ: "${item.question}"`);
    } else {
      await prisma.fAQ.create({
        data: {
          id: crypto.randomUUID(),
          question: item.question,
          answer: item.answer,
          category: item.category,
          published: true,
          sortOrder: 100 // High sort order so they appear beautifully
        }
      });
      console.log(`Created FAQ: "${item.question}"`);
    }
  }
  console.log("FAQ database upsert completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
