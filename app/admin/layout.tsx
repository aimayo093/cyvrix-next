import * as React from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import {
  AdminNotificationsMenu,
  AdminNotificationsButtonFallback,
} from "@/components/admin/AdminHeaderMenus";
import { AdminChromeFallback } from "@/components/admin/AdminChromeFallback";
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
    // The fallback draws the sidebar and header shape rather than a bare content
    // skeleton. While this boundary is pending there is no navigation and no
    // header at all, so a slow sign-in check used to look like a broken page.
    <React.Suspense fallback={<AdminChromeFallback />}>
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

  // The only query the chrome waits on. Everything else streams in, so a slow
  // or starved database cannot leave an administrator staring at a skeleton
  // with no sidebar and no header.
  const user = await requireAdmin();

  return (
    <AdminLayoutClient
      identity={{ name: user.name, email: user.email, role: user.role }}
      notificationsSlot={
        <React.Suspense fallback={<AdminNotificationsButtonFallback />}>
          <AdminNotifications userId={user.id} />
        </React.Suspense>
      }
    >
      <React.Suspense fallback={<PrivateRouteFallback />}>{children}</React.Suspense>
    </AdminLayoutClient>
  );
}

/**
 * Notifications, loaded outside the chrome's critical path.
 *
 * This was previously awaited in the layout itself, which put a second query
 * between an administrator and every page of the admin area on a connection
 * pool that is already at its limit. The bell now renders immediately and fills
 * in when the query returns.
 */
async function AdminNotifications({ userId }: { userId: string }) {
  const notifications = await prisma.notification
    .findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, title: true, body: true, createdAt: true, readAt: true },
    })
    .catch((error) => {
      // A header that cannot list notifications is a small problem. A header
      // that fails to render is a much bigger one.
      console.error("[admin-layout] could not load notifications", error);
      return [];
    });

  return (
    <AdminNotificationsMenu
      notifications={notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt.toISOString(),
        read: notification.readAt !== null,
      }))}
      unreadCount={notifications.filter((notification) => notification.readAt === null).length}
    />
  );
}
