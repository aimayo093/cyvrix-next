"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Ensure SurveySetting exists and return it
async function getOrCreateSurveySettings() {
  let settings = await prisma.surveySetting.findFirst();
  if (!settings) {
    settings = await prisma.surveySetting.create({
      data: {
        id: crypto.randomUUID(),
        autoSendEnabled: true,
        triggerOnResolved: true,
        triggerOnClosed: true,
        triggerOnJobCompleted: true,
        sendDelayMinutes: 0,
        emailSubject: "How did we do? Your feedback matters",
        emailBody: "Hello {{client_name}},\n\nYour recent support request/job has been marked as completed.\n\nWe would appreciate your feedback so we can continue improving the service we provide.\n\nTicket/Job Reference: {{reference_number}}\nService: {{service_name}}\n\nPlease take a moment to complete this short survey:\n{{survey_link}}\n\nThank you,\nCYVRIX Technologies",
        ratingType: "stars_5",
        lowRatingThreshold: 3,
        adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || "admin@cyvrix.co.uk",
        surveyExpiryDays: 7,
      },
    });
  }
  return settings;
}

// Trigger survey creation and email dispatch
export async function triggerSurvey(
  relatedType: "support_ticket" | "job" | "project_task" | "work_order",
  relatedId: string,
  contactEmail: string,
  contactName?: string | null,
  clientCompanyId?: string | null
) {
  try {
    const settings = await getOrCreateSurveySettings();
    if (!settings.autoSendEnabled) return null;

    // Avoid duplicates - check if a survey already exists for this ticket/job
    const existing = await prisma.surveyRequest.findFirst({
      where: { relatedType, relatedId },
    });
    if (existing) {
      console.info(`Survey already exists for ${relatedType}:${relatedId}, skipping trigger.`);
      return existing;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.surveyExpiryDays);

    const request = await prisma.surveyRequest.create({
      data: {
        id: crypto.randomUUID(),
        relatedType,
        relatedId,
        clientCompanyId,
        contactEmail,
        contactName: contactName || "Client",
        token,
        status: "pending",
        expiresAt,
      },
    });

    // Send the email
    await sendSurveyEmailInternal(request.id);

    return request;
  } catch (err) {
    console.error("Failed to trigger survey:", err);
    return null;
  }
}

// Internal email sender
async function sendSurveyEmailInternal(requestId: string) {
  const request = await prisma.surveyRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return;

  const settings = await getOrCreateSurveySettings();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "CYVRIX Technologies <noreply@cyvrix.co.uk>";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const surveyLink = `${baseUrl}/survey/${request.token}`;

  let referenceNumber = "CYV-REF-" + request.relatedId.slice(0, 8).toUpperCase();
  let serviceName = "Support Assistance";

  // Fetch ticket details to populate variables
  if (request.relatedType === "support_ticket") {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.relatedId },
      select: { ticketNumber: true, category: true },
    });
    if (ticket) {
      referenceNumber = ticket.ticketNumber;
      serviceName = ticket.category || "IT Support";
    }
  } else if (request.relatedType === "work_order") {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: request.relatedId },
      select: { title: true, serviceType: true },
    });
    if (workOrder) {
      referenceNumber = "CYV-WO-" + request.relatedId.slice(0, 6).toUpperCase();
      serviceName = workOrder.serviceType || "On-site Support";
    }
  }

  // Populate dynamic variables
  let body = settings.emailBody
    .replace(/\{\{client_name\}\}/g, request.contactName || "Client")
    .replace(/\{\{reference_number\}\}/g, referenceNumber)
    .replace(/\{\{service_name\}\}/g, serviceName)
    .replace(/\{\{survey_link\}\}/g, surveyLink);

  let subject = settings.emailSubject
    .replace(/\{\{reference_number\}\}/g, referenceNumber);

  if (!apiKey) {
    console.info("Dev Mode: Simulated Survey Email Dispatch:", {
      to: request.contactEmail,
      subject,
      surveyLink,
      body,
    });
    await prisma.surveyRequest.update({
      where: { id: requestId },
      data: { status: "sent", sentAt: new Date() },
    });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: request.contactEmail,
        subject,
        text: body,
      }),
    });

    if (res.ok) {
      await prisma.surveyRequest.update({
        where: { id: requestId },
        data: { status: "sent", sentAt: new Date() },
      });
    } else {
      const errText = await res.text();
      console.error("Resend delivery failed:", errText);
      await prisma.surveyRequest.update({
        where: { id: requestId },
        data: { status: "failed" },
      });
    }
  } catch (err) {
    console.error("Email fetch failed:", err);
    await prisma.surveyRequest.update({
      where: { id: requestId },
      data: { status: "failed" },
    });
  }
}

// Server Action: Submit survey response
export async function submitSurveyResponse(formData: FormData) {
  const token = formData.get("token") as string;
  const ratingRaw = formData.get("rating") as string;
  const rating = ratingRaw ? parseInt(ratingRaw, 10) : null;
  const npsRaw = formData.get("npsScore") as string;
  const npsScore = npsRaw ? parseInt(npsRaw, 10) : null;

  const responseTimeRaw = formData.get("responseTimeRating") as string;
  const responseTimeRating = responseTimeRaw ? parseInt(responseTimeRaw, 10) : null;
  const resolutionRaw = formData.get("resolutionRating") as string;
  const resolutionRating = resolutionRaw ? parseInt(resolutionRaw, 10) : null;
  const professionalismRaw = formData.get("professionalismRating") as string;
  const professionalismRating = professionalismRaw ? parseInt(professionalismRaw, 10) : null;

  const comments = (formData.get("comments") as string || "").replace(/[<>]/g, "");
  const allowFollowUp = formData.get("allowFollowUp") === "true";

  if (!token) {
    redirect("/survey/error?message=Token is missing.");
  }

  const request = await prisma.surveyRequest.findUnique({
    where: { token },
  });

  if (!request) {
    redirect("/survey/error?message=Invalid token. Link may have expired or is incorrect.");
  }

  if (request.status === "submitted") {
    redirect("/survey/error?message=This feedback has already been submitted. Thank you!");
  }

  if (request.expiresAt && new Date() > request.expiresAt) {
    redirect("/survey/error?message=This survey link has expired (7-day validity period).");
  }

  const responseId = crypto.randomUUID();
  const settings = await getOrCreateSurveySettings();

  // Create response
  await prisma.surveyResponse.create({
    data: {
      id: responseId,
      surveyRequestId: request.id,
      rating,
      npsScore,
      responseTimeRating,
      resolutionRating,
      professionalismRating,
      comments,
      allowFollowUp,
      submittedAt: new Date(),
    },
  });

  // Update request status
  await prisma.surveyRequest.update({
    where: { id: request.id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  // Check low rating threshold
  const limit = settings.lowRatingThreshold;
  const isLowRating =
    (rating !== null && rating <= limit) ||
    (npsScore !== null && npsScore <= (limit * 2)) ||
    (responseTimeRating !== null && responseTimeRating <= limit) ||
    (resolutionRating !== null && resolutionRating <= limit);

  if (isLowRating && settings.adminNotificationEmail) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM ?? "CYVRIX Technologies <noreply@cyvrix.co.uk>";
    const subject = `⚠️ Low Satisfaction Alert - ${request.contactName || "Client"}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const adminLink = `${baseUrl}/admin/surveys`;

    const body = `⚠️ CYVRIX Low Satisfaction Alert

Client Name: ${request.contactName || "Anonymous"}
Email: ${request.contactEmail}
Ticket/Job Reference: ${request.relatedId}

Rating given: ${rating !== null ? `${rating} / 5 stars` : "N/A"}
NPS score: ${npsScore !== null ? `${npsScore} / 10` : "N/A"}
Response time score: ${responseTimeRating !== null ? `${responseTimeRating} / 5` : "N/A"}

Client comments:
"${comments || "No comments provided."}"

Follow-up contact permitted: ${allowFollowUp ? "YES" : "NO"}

Review feedback in admin settings panel:
${adminLink}`;

    if (apiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: settings.adminNotificationEmail,
            subject,
            text: body,
          }),
        });
      } catch (err) {
        console.error("Failed to dispatch low-rating alert email:", err);
      }
    } else {
      console.info("Dev Mode Simulated Low Satisfaction Alert Dispatch:", {
        to: settings.adminNotificationEmail,
        subject,
        body,
      });
    }
  }

  revalidatePath("/admin/surveys");
  redirect("/survey/thank-you");
}

// Server Action: Update settings
export async function updateSurveySettingsAction(formData: FormData) {
  await requireAdmin();
  const autoSendEnabled = formData.get("autoSendEnabled") === "true";
  const triggerOnResolved = formData.get("triggerOnResolved") === "true";
  const triggerOnClosed = formData.get("triggerOnClosed") === "true";
  const triggerOnJobCompleted = formData.get("triggerOnJobCompleted") === "true";
  const sendDelayMinutes = parseInt(formData.get("sendDelayMinutes") as string || "0", 10);
  const emailSubject = formData.get("emailSubject") as string || "";
  const emailBody = formData.get("emailBody") as string || "";
  const ratingType = formData.get("ratingType") as string || "stars_5";
  const lowRatingThreshold = parseInt(formData.get("lowRatingThreshold") as string || "3", 10);
  const adminNotificationEmail = formData.get("adminNotificationEmail") as string || "";
  const surveyExpiryDays = parseInt(formData.get("surveyExpiryDays") as string || "7", 10);

  const settings = await getOrCreateSurveySettings();

  await prisma.surveySetting.update({
    where: { id: settings.id },
    data: {
      autoSendEnabled,
      triggerOnResolved,
      triggerOnClosed,
      triggerOnJobCompleted,
      sendDelayMinutes,
      emailSubject,
      emailBody,
      ratingType,
      lowRatingThreshold,
      adminNotificationEmail,
      surveyExpiryDays,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/surveys");
  redirect("/admin/surveys?status=settings_success");
}

// Server Action: Manually resend survey
export async function resendSurveyRequestAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.surveyRequest.update({
    where: { id },
    data: { status: "pending" },
  });

  await sendSurveyEmailInternal(id);
  revalidatePath("/admin/surveys");
}

// Server Action: Review survey response
export async function reviewSurveyResponseAction(formData: FormData) {
  const admin = await requireAdmin();
  const responseId = formData.get("responseId") as string;
  const internalNotes = (formData.get("internalNotes") as string || "").replace(/[<>]/g, "");

  if (!responseId) return;

  await prisma.surveyResponse.update({
    where: { id: responseId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: admin.email || "Admin",
      internalNotes,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/surveys");
}
