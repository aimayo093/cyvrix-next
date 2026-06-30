import { connection } from "next/server";
import { redirect } from "next/navigation";

// All specific admin routes now have dedicated pages.
// Redirect legacy/unknown module routes to the dashboard.
export default async function AdminModuleFallback({
  params,
}: {
  params: { module: string };
}) {
  await connection();
  redirect("/admin");
}
