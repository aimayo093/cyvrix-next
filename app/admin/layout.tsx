import * as React from "react";
import { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";

export const metadata: Metadata = {
  title: "Admin Dashboard | CYVRIX",
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
  await requireAdmin();

  return (
    <AdminLayoutClient>
      <React.Suspense fallback={<PrivateRouteFallback />}>{children}</React.Suspense>
    </AdminLayoutClient>
  );
}
