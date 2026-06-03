import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SurveyForm } from "./SurveyForm";
import Image from "next/image";

export const metadata = {
  title: "Customer Feedback Survey | CYVRIX Technologies",
  description: "Share your experience with CYVRIX Technologies. We value your feedback to continuously elevate our services.",
};

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
    redirect("/survey/error?message=Missing secure survey token.");
  }

  // Find the request
  const request = await prisma.surveyRequest.findUnique({
    where: { token },
  });

  if (!request) {
    redirect("/survey/error?message=This survey link is invalid. Please verify the URL in your email.");
  }

  if (request.status === "submitted") {
    redirect("/survey/error?message=This survey has already been completed. Thank you for your feedback!");
  }

  if (request.expiresAt && new Date() > request.expiresAt) {
    redirect("/survey/error?message=This survey link has expired. Survey invitations are valid for 7 days.");
  }

  // Fetch settings
  let settings = await prisma.surveySetting.findFirst();
  if (!settings) {
    // Generate default settings if missing
    settings = await prisma.surveySetting.create({
      data: {
        id: "default-settings",
        autoSendEnabled: true,
        triggerOnResolved: true,
        triggerOnClosed: true,
        triggerOnJobCompleted: true,
        sendDelayMinutes: 0,
        emailSubject: "How did we do? Your feedback matters",
        emailBody: "Hello {{client_name}},\n\nYour recent support request/job has been marked as completed.",
        ratingType: "stars_5",
        lowRatingThreshold: 3,
        adminNotificationEmail: "admin@cyvrix.co.uk",
        surveyExpiryDays: 7,
      },
    });
  }

  let referenceNumber = "CYV-REF-" + request.relatedId.slice(0, 8).toUpperCase();
  let serviceName = "Support Assistance";

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

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter text-slate-100 selection:bg-[#2691F0] selection:text-white">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-8 my-12">
        {/* Branding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[#2691F0] text-xs font-black tracking-widest uppercase">
            CYVRIX CUSTOMER CARE
          </div>
          <h1 className="font-outfit text-3xl md:text-4xl font-black text-white tracking-tight">
            Share Your Experience
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Your feedback directly impacts how we deliver managed services and support. Thank you for your time.
          </p>
        </div>

        {/* Info card */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 border border-slate-800 flex flex-wrap gap-6 items-center justify-between">
          <div>
            <p className="text-[10px] font-black tracking-widest text-[#2691F0] uppercase">Reference Number</p>
            <p className="text-sm font-bold text-white mt-1">{referenceNumber}</p>
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Service Provided</p>
            <p className="text-sm font-semibold text-slate-200 mt-1">{serviceName}</p>
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Client Contact</p>
            <p className="text-sm font-semibold text-slate-200 mt-1">{request.contactName || "Valued Client"}</p>
          </div>
        </div>

        {/* Survey Form Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl relative">
          <SurveyForm token={token} ratingType={settings.ratingType} />
        </div>

        <div className="text-center">
          <p className="text-[11px] text-slate-500">
            &copy; {new Date().getFullYear()} CYVRIX Technologies. All rights reserved. Secure Feedback Portal.
          </p>
        </div>
      </div>
    </main>
  );
}
