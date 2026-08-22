import * as React from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";

export const metadata: Metadata = {
  // Overrides the root template so admin tabs stay distinguishable from the public site.
  title: {
    default: "CYVRIX Admin",
    template: "%s | CYVRIX Admin",
  },
  description: "Internal management platform for CYVRIX Technologies.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </React.Suspense>
  );
}

async function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const user = await requireAdmin();

  // A failure here must not take the whole admin area down: the header can
  // render without notifications, but an administrator locked out of every
  // page because one query failed has a much bigger problem.
  const notifications = await prisma.notification
    .findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, title: true, body: true, createdAt: true, readAt: true },
    })
    .catch((error) => {
      console.error("[admin-layout] could not load notifications", error);
      return [];
    });

  return (
    <AdminLayoutClient
      identity={{ name: user.name, email: user.email, role: user.role }}
      notifications={notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt.toISOString(),
        read: notification.readAt !== null,
      }))}
      unreadCount={notifications.filter((notification) => notification.readAt === null).length}
    >
      <React.Suspense fallback={<PrivateRouteFallback />}>{children}</React.Suspense>
    </AdminLayoutClient>
  );
}
