"use server";

import crypto from "node:crypto";
import { reserveTicketNumber } from "@/lib/ticket-number";
import { canAccessTicket } from "@/lib/ticket-thread";
import { canAccessClientRecord } from "@/lib/client-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/email-verification";
import { SITE_URL } from "@/lib/structured-data";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { notifyTicketMessage } from "@/lib/ticket-notifications";
import {
  beginEnrolment,
  clearRecoveryCodeFlash,
  confirmEnrolment,
  disableTwoFactor,
  flashRecoveryCodes,
  regenerateRecoveryCodes,
} from "@/lib/two-factor";

const ticketSchema = z.object({
  subject: z.string().trim().min(5).max(200).transform(sanitize),
  description: z.string().trim().min(10).max(5000).transform(sanitize),
  priority: z.string().trim().min(1).max(20),
  category: z.string().trim().min(1).max(50),
});

const replySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(2).max(5000).transform(sanitize),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).transform(sanitize),
  // Changing a password requires proving you know the current one. The admin
  // side has always required this; the portal did not, so anyone holding a live
  // session - a borrowed laptop, a stolen cookie - could take the account over
  // and lock the owner out of it.
  currentPassword: z.string().max(100).optional().or(z.literal("")),
  password: z.string().min(8).max(100).optional().or(z.literal("")),
});

function sanitize(value: string) {
  return value.replace(/[<>]/g, "").slice(0, 5000);
}

/** One generator for all three entry points; see lib/ticket-number.ts. */
async function ticketNumber() {
  return reserveTicketNumber(async (candidate) =>
    (await prisma.ticket.count({ where: { ticketNumber: candidate } })) > 0
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function validationMessage(error: unknown, fallback: string) {
  return error instanceof z.ZodError ? error.issues[0]?.message ?? fallback : errorMessage(error, fallback);
}

function isNextRedirect(error: unknown): error is { digest: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createPortalTicket(_prevState: unknown, formData: FormData) {
  try {
    const user = await requireUser();
    
    // Parse form data
    const raw = Object.fromEntries(formData.entries());
    const data = ticketSchema.parse(raw);
    
    let companyName = "Independent Client";
    if (user.clientCompanyId) {
      const company = await prisma.clientCompany.findUnique({
        where: { id: user.clientCompanyId },
        select: { name: true }
      });
      if (company) {
        companyName = company.name;
      }
    }

    const tktNumber = await ticketNumber();
    
    await prisma.ticket.create({
      data: {
        id: crypto.randomUUID(),
        ticketNumber: tktNumber,
        clientCompanyId: user.clientCompanyId,
        name: user.name || "Client User",
        email: user.email,
        company: companyName,
        priority: data.priority,
        category: data.category,
        subject: data.subject,
        description: data.description,
        existingClient: true,
        status: "NEW",
        updatedAt: new Date(),
      }
    });

    revalidatePath("/portal/support-tickets");
    return { success: true, message: `Ticket ${tktNumber} successfully created.` };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Portal ticket error:", error);
    return { success: false, message: validationMessage(error, "Could not create ticket.") };
  }
}

export async function replyPortalTicket(_prevState: unknown, formData: FormData) {
  try {
    const user = await requireUser();
    
    const raw = Object.fromEntries(formData.entries());
    const data = replySchema.parse(raw);
    
    // Fetch ticket to verify ownership.
    //
    // Through `canAccessTicket`, which requires the client's company to be set
    // rather than merely equal. The previous test skipped the comparison
    // entirely when the ticket had no company - which is every ticket raised
    // through the public contact form - so any signed-in portal user could post
    // a reply into one.
    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticketId }
    });

    if (!canAccessTicket(user, ticket)) {
      return { success: false, message: "Unauthorized or invalid ticket." };
    }

    await prisma.ticketMessage.create({
      data: {
        id: crypto.randomUUID(),
        ticketId: data.ticketId,
        authorId: user.id,
        visibility: "client",
        body: data.message,
      }
    });

    // Touch the ticket, and hand it back to the queue only if it was actually
    // waiting on the client. This used to force every ticket to OPEN on any
    // client reply, so answering a question on a ticket someone was actively
    // working pulled it out of IN_PROGRESS and back into the general queue.
    await prisma.ticket.update({
      where: { id: data.ticketId },
      data: {
        updatedAt: new Date(),
        ...(ticket!.status === "WAITING_ON_CLIENT" ? { status: "OPEN" as const } : {}),
      }
    });

    // Staff learned about a client reply the next time somebody opened the
    // queue. A client message is always client-visible, so there is no note to
    // leak here - the direction is the other way.
    await notifyTicketMessage({
      ticketId: data.ticketId,
      direction: "to_staff",
      visibility: "client",
      body: data.message,
    });

    revalidatePath(`/portal/support-tickets`);
    return { success: true, message: "Reply posted successfully." };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Portal ticket reply error:", error);
    return { success: false, message: validationMessage(error, "Could not post reply.") };
  }
}

export async function acceptPortalProposal(proposalId: string) {
  try {
    const user = await requireUser();
    
    // Fetch proposal to check ownership
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    });
    
    // The same guard as tickets, and it had the same hole. Accepting a proposal
    // is a commercial commitment, and the previous check let any signed-in
    // portal user accept one belonging to no company - which is every proposal
    // raised against a quote request from the public site.
    if (!canAccessClientRecord(user, proposal)) {
      throw new Error("Unauthorized or invalid proposal.");
    }
    
    if (proposal!.status === "accepted") {
      return { success: true, message: "Proposal has already been accepted." };
    }

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      }
    });

    revalidatePath("/portal/quotes-and-proposals");
    return { success: true, message: "Proposal successfully accepted. Thank you for your business!" };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Accept proposal error:", error);
    return { success: false, message: errorMessage(error, "Could not accept proposal.") };
  }
}

export async function updatePortalProfile(_prevState: unknown, formData: FormData) {
  try {
    const user = await requireUser();
    
    const raw = Object.fromEntries(formData.entries());
    const data = profileSchema.parse(raw);

    const updateData: { name: string; updatedAt: Date; passwordHash?: string } = {
      name: data.name,
      updatedAt: new Date(),
    };

    if (data.password) {
      if (!data.currentPassword) {
        return { success: false, message: "Enter your current password to set a new one." };
      }

      const record = await prisma.user.findUnique({ where: { id: user.id } });
      if (!record?.passwordHash || !verifyPassword(data.currentPassword, record.passwordHash)) {
        // The same wording whether the record is missing or the password is
        // wrong, so a failed attempt says nothing about the account.
        return { success: false, message: "The current password you entered is incorrect." };
      }

      updateData.passwordHash = hashPassword(data.password);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    if (updateData.passwordHash) {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: "portal_password_changed",
          entityType: "User",
          metadata: { email: user.email },
        },
      });
    }

    revalidatePath("/portal/profile-and-company");
    return {
      success: true,
      message: updateData.passwordHash
        ? "Profile and password updated."
        : "Profile successfully updated.",
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Profile update error:", error);
    return { success: false, message: validationMessage(error, "Could not update profile.") };
  }
}

export async function submitPortalTestimonial(formData: FormData) {
  try {
    const user = await requireUser();
    const quoteValue = formData.get("quote");
    const ratingValue = formData.get("rating");
    const quote = typeof quoteValue === "string" ? quoteValue : "";
    const ratingRaw = typeof ratingValue === "string" ? ratingValue : "";
    const rating = Number.parseInt(ratingRaw, 10);

    if (!quote.trim()) {
      redirect("/portal?status=error&message=Testimonial quote cannot be empty.");
    }

    if (![3, 4, 5].includes(rating)) {
      redirect("/portal?status=error&message=Please select a valid testimonial rating.");
    }

    let companyName = "Independent Client";
    if (user.clientCompanyId) {
      const company = await prisma.clientCompany.findUnique({
        where: { id: user.clientCompanyId },
        select: { name: true }
      });
      if (company) {
        companyName = company.name;
      }
    }

    const testimonialId = crypto.randomUUID();
    await prisma.$transaction([
      prisma.testimonial.create({
        data: {
          id: testimonialId,
          clientName: user.name || "Client User",
          company: companyName,
          quote: sanitize(quote),
          rating,
          approved: false,
          featured: false,
          createdAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: "portal_testimonial_submitted",
          entityType: "Testimonial",
          entityId: testimonialId,
          metadata: { rating, source: "client_portal" },
        },
      }),
    ]);

    revalidatePath("/portal");
    redirect("/portal?status=success&message=Thank you. Your testimonial was submitted for review and remains private until CYVRIX verifies and approves it for public use.");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Portal testimonial error:", error);
    redirect(`/portal?status=error&message=${encodeURIComponent(errorMessage(error, "Could not submit testimonial."))}`);
  }
}

/**
 * Lets a signed-in client ask for their confirmation link again.
 *
 * Deliberately not a public endpoint. A "resend verification" form that takes
 * an address from an anonymous caller answers two questions it should not: it
 * tells the caller whether an account exists, and it hands anyone a button that
 * sends mail to a stranger. Doing it from inside the portal removes both -
 * the account is already known from the session, and an unverified address does
 * not block signing in, so anyone who needs this can reach it.
 *
 * Rate limited per user because the send is free to the caller and not to us.
 */
export async function requestMyVerificationEmail() {
  const user = await requireUser();

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, emailVerified: true },
  });

  if (!record) return { ok: false as const, message: "Account not found." };
  if (record.emailVerified) {
    return { ok: false as const, message: "Your email address is already confirmed." };
  }

  try {
    enforceRateLimit(`verify-resend:${record.id}`, { limit: 3, windowMs: 60 * 60_000 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        ok: false as const,
        message: "A link was sent recently. Check your inbox and spam folder, then try again in an hour.",
      };
    }
    throw error;
  }

  const delivery = await sendVerificationEmail(record.id, SITE_URL);

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: record.id,
      action: delivery.ok ? "verification_email_sent" : "verification_email_failed",
      entityType: "User",
      entityId: record.id,
      metadata: { trigger: "client_request", reason: delivery.ok ? null : delivery.reason },
    },
  });

  if (!delivery.ok) {
    return { ok: false as const, message: "We could not send the link just now. Please try again shortly." };
  }

  revalidatePath("/portal");
  return { ok: true as const, message: "Sent. Check your inbox, and your spam folder if it is not there." };
}

/*
 * Two-factor authentication for portal clients.
 *
 * Mirrors the administrator flow against the same code in lib/two-factor. The
 * enrolment, the code check, the rate limit and the hashed recovery codes are
 * all shared; only where the browser lands afterwards and what the audit row
 * says differ, which is why these are separate actions rather than the admin
 * ones with a role check bolted on.
 *
 * Clients hold ticket history, documents and proposals. An account protected
 * only by a password an administrator typed once is worth less than one the
 * client can put a second factor on themselves.
 */
const PORTAL_PROFILE = "/portal/profile-and-company";

export async function startClientTwoFactorEnrolment() {
  const user = await requireUser();
  await beginEnrolment(user.id, user.email);
  redirect(`${PORTAL_PROFILE}?enrol=2fa`);
}

export async function confirmClientTwoFactorEnrolment(formData: FormData) {
  const user = await requireUser();
  const code = (formData.get("code") as string | null)?.trim() ?? "";

  const result = await confirmEnrolment(user.id, code);

  if (!result.ok) {
    const message =
      result.reason === "bad_code"
        ? "That code was not accepted. Check the time on your phone and try the current code."
        : result.reason === "rate_limited"
          ? "Too many attempts. Wait a few minutes and try again."
          : "Start the setup again.";
    redirect(`${PORTAL_PROFILE}?enrol=2fa&status=error&message=${encodeURIComponent(message)}`);
  }

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      action: "client_two_factor_enabled",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email },
    },
  });

  // One-time httpOnly cookie, not the URL: a query string would put ten working
  // credentials into browser history and any log that records the path.
  await flashRecoveryCodes(result.recoveryCodes);
  redirect(PORTAL_PROFILE);
}

export async function dismissClientRecoveryCodes() {
  await requireUser();
  await clearRecoveryCodeFlash();
  redirect(PORTAL_PROFILE);
}

export async function issueNewClientRecoveryCodes() {
  const user = await requireUser();
  const codes = await regenerateRecoveryCodes(user.id);

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      action: "client_recovery_codes_reissued",
      entityType: "User",
      entityId: user.id,
    },
  });

  await flashRecoveryCodes(codes);
  redirect(PORTAL_PROFILE);
}

export async function turnOffClientTwoFactor() {
  const user = await requireUser();
  await disableTwoFactor(user.id);

  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      action: "client_two_factor_disabled",
      entityType: "User",
      entityId: user.id,
    },
  });

  redirect(PORTAL_PROFILE);
}
