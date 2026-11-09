import { prisma } from "@/lib/prisma";

/**
 * Fetches overview statistics for the Admin Dashboard.
 *
 * Returns null when the counts cannot be read. It used to return zeros, which
 * on the dashboard reads as "no enquiries, no tickets" — a quiet day rather
 * than a database the admin cannot reach.
 */
export async function getAdminStats() {
  try {
    const [clientCount, activeTickets, newLeads, totalSubscribers] = await Promise.all([
      prisma.clientCompany.count({ where: { status: "active" } }),
      prisma.ticket.count({ where: { status: { not: "CLOSED" } } }),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.newsletterSubscriber.count({ where: { status: "subscribed" } }),
    ]);

    return {
      totalClients: clientCount,
      activeTickets,
      newLeads,
      totalSubscribers,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return null;
  }
}

/**
 * Fetches recent audit logs/activities for the Admin Dashboard.
 *
 * Returns null when the audit log cannot be read, so the dashboard can say so
 * instead of showing "no recent operations".
 */
export async function getRecentActivities(limit = 5) {
  try {
    const activities = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return activities.map((activity) => ({
      id: activity.id,
      user: activity.userId || "System",
      action: activity.action.replace(/_/g, " "),
      timestamp: activity.createdAt,
      type: activity.entityType || "General",
    }));
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return null;
  }
}

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
