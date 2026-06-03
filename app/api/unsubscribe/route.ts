import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/unsubscribe?email=...&token=...
 *
 * GDPR-compliant one-click unsubscribe.
 * Token = SHA-256(email + UNSUBSCRIBE_SECRET) — generated when each confirmation
 * email is sent and appended as a query param.
 *
 * For now we also accept email-only (no token) so existing subscribers can
 * unsubscribe immediately — tighten this once you implement token generation
 * in the subscribe confirmation email.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return new NextResponse(unsubscribePage("Missing email address.", false), {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

    if (!existing) {
      return new NextResponse(unsubscribePage("This email address is not on our list.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (existing.status === "unsubscribed") {
      return new NextResponse(unsubscribePage("You are already unsubscribed.", true), {
        headers: { "Content-Type": "text/html" },
      });
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { status: "unsubscribed" },
    });

    return new NextResponse(unsubscribePage("You have been successfully unsubscribed.", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new NextResponse(unsubscribePage("An error occurred. Please contact us directly.", false), {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
}

function unsubscribePage(message: string, success: boolean) {
  const color = success ? "#34d399" : "#f87171";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribe | CYVRIX</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #020817; color: #fff; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: #041635; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 1.5rem; padding: 3rem 2.5rem; max-width: 480px;
            width: 100%; text-align: center; }
    .icon { font-size: 2.5rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 900; margin-bottom: 0.75rem; }
    p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
    .status { color: ${color}; font-weight: 700; font-size: 1rem; margin-bottom: 1rem; }
    a { color: #2691F0; text-decoration: none; font-size: 0.875rem; font-weight: 700; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "⚠️"}</div>
    <h1>Unsubscribe</h1>
    <p class="status">${message}</p>
    <p>You will no longer receive newsletters or marketing emails from CYVRIX Technologies.</p>
    <a href="/">Return to CYVRIX</a>
  </div>
</body>
</html>`;
}
