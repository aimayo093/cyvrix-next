import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyNewsletterUnsubscribeToken } from "@/lib/newsletter-unsubscribe";


/**
 * GET or POST /api/unsubscribe?email=...&token=...
 *
 * Signed one-click unsubscribe for newsletter confirmation and campaign emails.
 * Token = HMAC-SHA-256(email, signing secret), generated when each newsletter
 * confirmation email is sent and appended as a query parameter.
 *
 * Requests without the matching token are rejected before any subscriber lookup.
 * GET renders a user-facing confirmation; POST supports RFC 8058 one-click mail actions.
 */
function unsubscribeParams(req: Request) {
  const { searchParams } = new URL(req.url);
  return {
    email: searchParams.get("email")?.toLowerCase().trim(),
    token: searchParams.get("token"),
  };
}

async function unsubscribe(email: string) {
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  if (!existing) return "missing" as const;
  if (existing.status === "unsubscribed") return "already" as const;

  await prisma.newsletterSubscriber.update({
    where: { email },
    data: { status: "unsubscribed" },
  });

  return "updated" as const;
}

export async function GET(req: Request) {
  const { email, token } = unsubscribeParams(req);

  if (!email || !verifyNewsletterUnsubscribeToken(email, token)) {
    return new NextResponse(unsubscribePage("This unsubscribe link is invalid.", false), {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  try {
    const result = await unsubscribe(email);
    if (result === "missing") {
      return new NextResponse(unsubscribePage("This email address is not on our list.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (result === "already") {
      return new NextResponse(unsubscribePage("You are already unsubscribed.", true), {
        headers: { "Content-Type": "text/html" },
      });
    }

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

export async function POST(req: Request) {
  const { email, token } = unsubscribeParams(req);

  if (!email || !verifyNewsletterUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid unsubscribe request." }, { status: 400 });
  }

  try {
    await unsubscribe(email);
    return new NextResponse(null, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unsubscribe request could not be completed." }, { status: 500 });
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
