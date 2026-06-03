import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { StatusClient } from "./StatusClient";

export const metadata = { title: "System Status | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function AdminStatusPage() {
  await requireAdmin();
  
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]" id="admin-status-heading">System Status</h1>
        <p className="text-slate-500 text-sm mt-1">
          Monitor the real-time health and response SLA metrics of core CYVRIX infrastructure and services.
        </p>
      </div>
      
      <StatusClient />
    </div>
  );
}
