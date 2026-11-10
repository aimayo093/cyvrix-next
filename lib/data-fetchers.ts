import { prisma } from "@/lib/prisma";

/**
 * Fetches stats for a specific client (Client Portal).
 */
export async function getPortalStats(clientCompanyId?: string) {
  if (!clientCompanyId) return null;

  try {
    const [tickets, documents] = await Promise.all([
      prisma.ticket.count({ 
        where: { clientCompanyId, status: { not: "CLOSED" } } 
      }),
      prisma.clientDocument.count({ 
        where: { clientCompanyId, visibleToClient: true } 
      }),
    ]);

    return {
      activeTickets: tickets,
      storedDocuments: documents,
    };
  } catch (error) {
    console.error("Error fetching portal stats:", error);
    return null;
  }
}
