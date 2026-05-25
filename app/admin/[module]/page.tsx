import { redirect } from "next/navigation";

// All specific admin routes now have dedicated pages.
// Redirect legacy/unknown module routes to the dashboard.
export default function AdminModuleFallback({
  params,
}: {
  params: { module: string };
}) {
  redirect("/admin");
}
