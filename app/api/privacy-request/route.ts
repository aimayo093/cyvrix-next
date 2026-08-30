import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/same-origin";
import { headers } from "next/headers";
import { z } from "zod";
import { enforceRateLimit, getClientAddress, RateLimitError } from "@/lib/rate-limit";
import { isPrivacyRequestType, submitPrivacyRequest } from "@/lib/privacy-requests";

const schema = z.object({
  requestType: z.string().refine(isPrivacyRequestType, "Choose the request you want to make."),
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase().max(200),
  details: z.string().trim().max(4000).default(""),
  // Explicit acknowledgement, matching the other public forms.
  consent: z.literal("on", { message: "Please confirm you have read the Privacy Policy." }),
  // Must stay empty. A field a person never sees and a bot fills in.
  _hp: z.string().max(0).optional(),
});

function redirectWithError(request: Request, message: string, status = 303) {
  return NextResponse.redirect(
    new URL(`/privacy-request?status=error&message=${encodeURIComponent(message)}`, request.url),
    status
  );
}

export async function POST(request: Request) {
  // Refused before anything else runs. See lib/same-origin.ts.
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const requestHeaders = await headers();
  const clientAddress = getClientAddress(requestHeaders);
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

  try {
    // A rights request is low-volume by nature; these limits stop the endpoint
    // being used to generate mail to the DPO.
    enforceRateLimit(`privacy-request:ip:${clientAddress}`, { limit: 5, windowMs: 60 * 60_000 });

    const formData = await request.formData();
    const raw = Object.fromEntries(formData);

    // Honeypot, matching submit-contact, submit-ticket and subscribe. This was
    // the one public POST route without it. Answer as though it succeeded, so a
    // bot gets no signal about which field gave it away.
    if (raw._hp) {
      return wantsJson
        ? NextResponse.json({ ok: true }, { status: 200 })
        : NextResponse.redirect(new URL("/privacy-request?status=success", request.url), 303);
    }

    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please check the form and try again.";
      return wantsJson
        ? NextResponse.json({ error: message }, { status: 422 })
        : redirectWithError(request, message);
    }

    enforceRateLimit(`privacy-request:email:${parsed.data.email}`, { limit: 3, windowMs: 60 * 60_000 });

    const outcome = await submitPrivacyRequest({
      requestType: parsed.data.requestType,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      details: parsed.data.details,
      ipAddress: clientAddress,
    });

    // The request is only reported as received if it was actually recorded.
    if (!outcome.recorded && !outcome.notified) {
      const message =
        "Your request could not be recorded. Please email our Data Protection Officer directly so that it is not lost.";
      return wantsJson
        ? NextResponse.json({ error: message }, { status: 503 })
        : redirectWithError(request, message);
    }

    if (wantsJson) {
      return NextResponse.json({ success: true, reference: outcome.reference }, { status: 201 });
    }

    return NextResponse.redirect(
      new URL(`/privacy-request?status=received&reference=${encodeURIComponent(outcome.reference)}`, request.url),
      303
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      const message = "Too many requests from this connection. Please wait before trying again.";
      const retryHeaders = { "Retry-After": String(error.retryAfterSeconds), "Cache-Control": "no-store" };
      return wantsJson
        ? NextResponse.json({ error: message }, { status: 429, headers: retryHeaders })
        : NextResponse.redirect(
            new URL(`/privacy-request?status=error&message=${encodeURIComponent(message)}`, request.url),
            { status: 303, headers: retryHeaders }
          );
    }

    console.error("[privacy-request] unexpected failure", error);
    const message = "Something went wrong. Please email our Data Protection Officer directly.";
    return wantsJson
      ? NextResponse.json({ error: message }, { status: 500 })
      : redirectWithError(request, message);
  }
}
