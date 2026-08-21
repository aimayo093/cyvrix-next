import { PrivateRouteFallback } from "@/components/shared/PrivateRouteFallback";
import { connection } from "next/server";
import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { StatusClient } from "./StatusClient";

export const metadata = { title: "System Status" };

export default function AdminStatusPage() {
  return (
    <React.Suspense fallback={<PrivateRouteFallback />}>
      <AdminStatusPageContent />
    </React.Suspense>
  );
}

async function AdminStatusPageContent() {
  await connection();
  await requireAdmin();
  
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-outfit text-3xl font-black text-[#041635]" id="admin-status-heading">System Status</h1>
        <p className="text-slate-500 text-sm mt-1">
          Service-status reporting is available only from verified monitoring and incident sources.
        </p>
      </div>
      
      <StatusClient />
    </div>
  );
}
