import * as React from "react";
import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Dashboard | CYVRIX",
  description: "Internal management platform for CYVRIX Technologies.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
