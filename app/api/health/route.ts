import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

const healthHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET() {
  await connection();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { headers: healthHeaders },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", timestamp: new Date().toISOString() },
      { status: 503, headers: healthHeaders },
    );
  }
}
