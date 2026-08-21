import { NextResponse } from "next/server";
import { canManageSecurityCenter, getSession } from "@/lib/auth";
import { getSecurityCenterSettings, runSecurityScan } from "@/lib/security-scan";

function getRequestOrigin(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSecurityCenter(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getSecurityCenterSettings();
  const result = await runSecurityScan({
    requestOrigin: getRequestOrigin(req),
    trigger: "manual",
    settings,
  });

  return NextResponse.json(result);
}
