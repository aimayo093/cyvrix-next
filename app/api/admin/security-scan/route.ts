import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSecurityCenterSettings, runSecurityScan } from "@/lib/security-scan";

function getRequestOrigin(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSecurityCenterSettings();
  const result = await runSecurityScan({
    requestOrigin: getRequestOrigin(req),
    trigger: "manual",
    settings,
  });

  return NextResponse.json(result);
}
