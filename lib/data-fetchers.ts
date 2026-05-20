import { prisma } from "@/lib/prisma";

/**
 * Fetches overview statistics for the Admin Dashboard.
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
      // Mocked security score for now, could be derived from an aggregate of client data later
      securityScore: 94,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      totalClients: 0,
      activeTickets: 0,
      newLeads: 0,
      totalSubscribers: 0,
      securityScore: 0,
    };
  }
}

/**
 * Fetches recent audit logs/activities for the Admin Dashboard.
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
    return [];
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
      systemUptime: "99.9%", // Usually a global or service-level metric
    };
  } catch (error) {
    console.error("Error fetching portal stats:", error);
    return null;
  }
}
