"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

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
  password: z.string().min(8).max(100).optional().or(z.literal("")),
});

function sanitize(value: string) {
  return value.replace(/[<>]/g, "").slice(0, 5000);
}

function ticketNumber() {
  const suffix = Math.floor(Date.now() / 1000).toString().slice(-6);
  return `CYV-TKT-${suffix.padStart(6, "0")}`;
}

export async function createPortalTicket(prevState: any, formData: FormData) {
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

    const tktNumber = ticketNumber();
    
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
  } catch (error: any) {
    console.error("Portal ticket error:", error);
    return { success: false, message: error instanceof z.ZodError ? error.issues[0].message : error.message || "Could not create ticket." };
  }
}

export async function replyPortalTicket(prevState: any, formData: FormData) {
  try {
    const user = await requireUser();
    
    const raw = Object.fromEntries(formData.entries());
    const data = replySchema.parse(raw);
    
    // Fetch ticket to verify ownership
    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticketId }
    });
    
    if (!ticket || (ticket.clientCompanyId && ticket.clientCompanyId !== user.clientCompanyId)) {
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

    // Update ticket modified timestamp
    await prisma.ticket.update({
      where: { id: data.ticketId },
      data: { 
        updatedAt: new Date(),
        status: "OPEN" // transition back to OPEN if WAITING_ON_CLIENT or similar
      }
    });

    revalidatePath(`/portal/support-tickets`);
    return { success: true, message: "Reply posted successfully." };
  } catch (error: any) {
    console.error("Portal ticket reply error:", error);
    return { success: false, message: error instanceof z.ZodError ? error.issues[0].message : error.message || "Could not post reply." };
  }
}

export async function acceptPortalProposal(proposalId: string) {
  try {
    const user = await requireUser();
    
    // Fetch proposal to check ownership
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    });
    
    if (!proposal || (proposal.clientCompanyId && proposal.clientCompanyId !== user.clientCompanyId)) {
      throw new Error("Unauthorized or invalid proposal.");
    }
    
    if (proposal.status === "accepted") {
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
  } catch (error: any) {
    console.error("Accept proposal error:", error);
    return { success: false, message: error.message || "Could not accept proposal." };
  }
}

export async function updatePortalProfile(prevState: any, formData: FormData) {
  try {
    const user = await requireUser();
    
    const raw = Object.fromEntries(formData.entries());
    const data = profileSchema.parse(raw);
    
    const updateData: any = {
      name: data.name,
      updatedAt: new Date()
    };
    
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    revalidatePath("/portal/profile-and-company");
    return { success: true, message: "Profile successfully updated." };
  } catch (error: any) {
    console.error("Profile update error:", error);
    return { success: false, message: error instanceof z.ZodError ? error.issues[0].message : error.message || "Could not update profile." };
  }
}

export async function submitPortalTestimonial(formData: FormData) {
  try {
    const user = await requireUser();
    const quote = formData.get("quote") as string || "";
    const ratingRaw = formData.get("rating") as string || "5";
    const rating = parseInt(ratingRaw, 10) || 5;

    if (!quote.trim()) {
      redirect("/portal?status=error&message=Testimonial quote cannot be empty.");
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

    await prisma.testimonial.create({
      data: {
        id: crypto.randomUUID(),
        clientName: user.name || "Client User",
        company: companyName,
        quote: sanitize(quote),
        rating,
        approved: true,
        featured: true,
        createdAt: new Date(),
      }
    });

    revalidatePath("/");
    revalidatePath("/portal");
    redirect("/portal?status=success&message=Thank you! Your testimonial has been submitted and is now active on our public website.");
  } catch (error: any) {
    if (error.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Portal testimonial error:", error);
    redirect(`/portal?status=error&message=${encodeURIComponent(error.message || "Could not submit testimonial.")}`);
  }
}

