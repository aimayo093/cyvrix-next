import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  FolderOpen, 
  User, 
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  FileCheck,
  Download,
  Bell
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { 
  ProfileUpdateForm, 
  ProposalApprovalButton, 
  PortalTicketForm, 
  PortalTicketChat 
} from "./client-components";

// Generate Static Params for the App Router to pre-build routes
export function generateStaticParams() {
  return [
    { module: "profile-and-company" },
    { module: "support-tickets" },
    { module: "quotes-and-proposals" },
    { module: "services" },
    { module: "documents" },
    { module: "notifications" }
  ];
}

interface PageProps {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PortalModulePage({ params, searchParams }: PageProps) {
  const { module } = await params;
  const { id } = await searchParams;
  const user = await requireUser();

  // Verify that the module is a valid one
  const validModules = ["profile-and-company", "support-tickets", "quotes-and-proposals", "services", "documents", "notifications"];
  if (!validModules.includes(module)) {
    redirect("/portal");
  }

  // Load client company details if present
  const company = user.clientCompanyId
    ? await prisma.clientCompany.findUnique({
        where: { id: user.clientCompanyId }
      })
    : null;

  // Pre-load data based on active module to keep JSX exceptionally clean and standard-compliant
  let selectedTicket: any = null;
  let initialMessages: any[] = [];
  let tickets: any[] = [];
  let proposals: any[] = [];
  let documents: any[] = [];
  let notifications: any[] = [];

  // Load support tickets
  if (module === "support-tickets") {
    if (id) {
      selectedTicket = await prisma.ticket.findUnique({
        where: { id: String(id) },
        include: { TicketMessage: { orderBy: { createdAt: "asc" } } }
      });

      if (selectedTicket && selectedTicket.clientCompanyId === user.clientCompanyId) {
        initialMessages = await Promise.all(
          selectedTicket.TicketMessage.map(async (msg: any) => {
            let authorName = "CYVRIX Support";
            if (msg.authorId === user.id) {
              authorName = "You";
            } else if (msg.authorId) {
              const authorUser = await prisma.user.findUnique({
                where: { id: msg.authorId },
                select: { name: true, role: true }
              });
              if (authorUser) {
                authorName = authorUser.role === "CLIENT" 
                  ? (authorUser.name || "Client User") 
                  : `CYVRIX Analyst (${authorUser.name || "Operations Desk"})`;
              }
            }
            return {
              id: msg.id,
              authorId: msg.authorId,
              body: msg.body,
              createdAt: msg.createdAt,
              authorName
            };
          })
        );
      }
    } else {
      tickets = await prisma.ticket.findMany({
        where: { clientCompanyId: user.clientCompanyId ?? "none" },
        orderBy: { createdAt: "desc" }
      });
    }
  }

  // Load proposals
  if (module === "quotes-and-proposals") {
    proposals = await prisma.proposal.findMany({
      where: { clientCompanyId: user.clientCompanyId ?? "none" },
      include: { ProposalItem: true },
      orderBy: { createdAt: "desc" }
    });
  }

  // Load documents
  if (module === "documents") {
    documents = await prisma.clientDocument.findMany({
      where: { 
        clientCompanyId: user.clientCompanyId ?? "none",
        visibleToClient: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  // Load notifications
  if (module === "notifications") {
    notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" }
    });
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Navigation & Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/portal" 
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#041635] hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-black text-[#2691F0] uppercase tracking-widest">Client Workspace</p>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">
            {module === "profile-and-company" && "Profile & Company"}
            {module === "support-tickets" && "Support Tickets"}
            {module === "quotes-and-proposals" && "Quotes & Proposals"}
            {module === "services" && "Active Subscriptions"}
            {module === "documents" && "Shared Documents"}
            {module === "notifications" && "System Notifications"}
          </h1>
        </div>
      </div>

      {/* Render Module Contents */}
      
      {/* 1. PROFILE & COMPANY */}
      {module === "profile-and-company" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="p-3 bg-blue-50 text-[#2691F0] rounded-2xl">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-outfit text-lg font-black text-[#041635]">Your Profile Details</h3>
                <p className="text-xs font-bold text-slate-400">Update your account credentials</p>
              </div>
            </div>
            <ProfileUpdateForm initialName={user.name || ""} />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="p-3 bg-blue-50 text-[#2691F0] rounded-2xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-outfit text-lg font-black text-[#041635]">Company Information</h3>
                <p className="text-xs font-bold text-slate-400">Your organization settings</p>
              </div>
            </div>

            {company ? (
              <div className="space-y-6 font-bold text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-black">Registered Name</p>
                    <p className="text-[#041635]">{company.name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-black">Industry</p>
                    <p className="text-[#041635]">{company.industry || "Not Specified"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-black">Billing Contact</p>
                    <p className="text-[#041635]">{company.billingContact || "Not Configured"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-black">Security Officer</p>
                    <p className="text-[#041635]">{company.securityContact || "Not Configured"}</p>
                  </div>
                </div>

                {company.notes && (
                  <div className="bg-[#EAF4FF] p-6 rounded-2xl border border-blue-100 text-[#041635]">
                    <h4 className="text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#2691F0]" />
                      Partnership Notes
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-600 font-medium">{company.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 border-dashed rounded-3xl text-slate-400">
                <Building2 className="h-12 w-12 mx-auto opacity-30 mb-4" />
                <p className="font-bold text-sm">No client company associated with your account.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SUPPORT TICKETS */}
      {module === "support-tickets" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List and View Section */}
          <div className="lg:col-span-2 space-y-6">
            {id ? (
              selectedTicket && selectedTicket.clientCompanyId === user.clientCompanyId ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#2691F0] px-2.5 py-1 rounded">
                          {selectedTicket.ticketNumber}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded ${
                          selectedTicket.status === "CLOSED" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                        }`}>
                          {selectedTicket.status}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 px-2.5 py-1 rounded">
                          {selectedTicket.priority} Priority
                        </span>
                      </div>
                      <h2 className="font-outfit text-xl font-black text-[#041635]">{selectedTicket.subject}</h2>
                      <p className="text-xs text-slate-400 font-bold mt-1">Submitted on {new Date(selectedTicket.createdAt).toLocaleDateString("en-GB")}</p>
                    </div>
                    <Link 
                      href="/portal/support-tickets" 
                      className="text-xs font-bold text-[#2691F0] hover:text-[#1a7fd9] flex items-center gap-1.5 shrink-0 self-start md:self-center"
                    >
                      Back to tickets <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-200">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Original Ticket Inquiry</h4>
                    <p className="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  <PortalTicketChat ticketId={selectedTicket.id} initialMessages={initialMessages} />
                </div>
              ) : (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl text-slate-500 font-bold">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  Unauthorized Ticket Request.
                </div>
              )
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-outfit font-black text-[#041635]">Ticket History</h3>
                  <span className="text-xs font-bold text-slate-400">{tickets.length} total records</span>
                </div>

                {tickets.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 space-y-3">
                    <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                    <p className="font-bold text-sm">No support tickets have been opened by your company.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                          <th className="px-6 py-4">Ticket</th>
                          <th className="px-6 py-4">Subject</th>
                          <th className="px-6 py-4">Priority</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Modified</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-sm">
                        {tickets.map((tkt) => (
                          <tr key={tkt.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {tkt.ticketNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[#041635] font-black line-clamp-1">{tkt.subject}</p>
                              <p className="text-[10px] text-slate-400">{tkt.category}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                                tkt.priority === "CRITICAL" ? "bg-red-50 text-red-600" :
                                tkt.priority === "HIGH" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-[#2691F0]"
                              }`}>
                                {tkt.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                                tkt.status === "CLOSED" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {tkt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400">
                              {new Date(tkt.updatedAt).toLocaleDateString("en-GB")}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link 
                                href={`/portal/support-tickets?id=${tkt.id}`}
                                className="text-xs text-[#2691F0] hover:text-[#1a7fd9] inline-flex items-center gap-1"
                              >
                                Correspond <ChevronRight className="h-4.5 w-4.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Ticket Form (1 col sidebar) */}
          <div className="space-y-6">
            <PortalTicketForm />

            <div className="bg-[#041635] text-white p-8 rounded-3xl space-y-4">
              <h4 className="font-outfit text-md font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#2691F0]" />
                Security First Support
              </h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                All replies, tickets, and attachments are processed strictly inside CYVRIX secure networks. Database Row Level Security (RLS) is applied dynamically matching your workspace token.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROPOSALS & QUOTES */}
      {module === "quotes-and-proposals" && (
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-outfit font-black text-[#041635]">Proposals & Scoped Agreements</h3>
              <span className="text-xs font-bold text-slate-400">{proposals.length} active documents</span>
            </div>

            {proposals.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-4">
                <FileText className="h-12 w-12 mx-auto opacity-30" />
                <p className="font-bold text-sm">No active proposals or service agreements found.</p>
                <Link 
                  href="/book-consultation"
                  className="inline-flex px-5 py-2.5 bg-blue-50 text-[#2691F0] hover:bg-blue-100 font-bold rounded-xl text-xs transition-all uppercase tracking-wider cursor-pointer"
                >
                  Book Free Scoping Consultation
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {proposals.map((prop) => (
                  <div key={prop.id} className="p-8 hover:bg-slate-50/20 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-wider ${
                            prop.status === "accepted" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-[#2691F0]"
                          }`}>
                            {prop.status}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            Created on {new Date(prop.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <h4 className="font-outfit text-xl font-black text-[#041635]">{prop.title}</h4>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Total Scope Cost</p>
                        <p className="font-outfit text-3xl font-black text-[#041635]">£{Number(prop.total).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {/* Proposal Items */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-6">
                      <h5 className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-4">Included Deliverables</h5>
                      <div className="space-y-3 font-bold text-sm">
                        {prop.ProposalItem.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/50 last:border-0">
                            <span>{item.description} (x{Number(item.quantity)})</span>
                            <span className="text-[#041635]">£{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                        <FileCheck className="h-4 w-4" />
                        <span>Aligned to Master Service Agreement (MSA)</span>
                      </div>
                      <ProposalApprovalButton 
                        proposalId={prop.id} 
                        isAccepted={prop.status === "accepted"} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ACTIVE SERVICES */}
      {module === "services" && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-outfit text-xl font-black text-[#041635]">Your Covered Technologies</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-2xl">
              Below are the active SLA agreements, endpoint protection, or transformation services registered in your CYVRIX corporate account.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: "24/7 Managed IT Support", tier: "Enterprise SLAs - remote + planned onsite", status: "ACTIVE", renewal: "24 June 2026", details: "Covers remote support, daily server status verification, endpoint agent controls, and office router patch schedules." },
                { name: "Advanced Endpoint Security", tier: "CrowdStrike Falcon Insight EDR", status: "ACTIVE", renewal: "24 June 2026", details: "Real-time behavior analysis, endpoint encryption reports, multi-factor credential auditing, and automated risk registers." }
              ].map((svc) => (
                <div key={svc.name} className="p-6 rounded-2xl border border-slate-200 hover:border-[#2691F0]/40 transition-all font-bold text-sm bg-slate-50/50">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h4 className="font-outfit text-lg font-black text-[#041635]">{svc.name}</h4>
                      <p className="text-xs text-[#2691F0] mt-1">{svc.tier}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded tracking-wider">
                      {svc.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">{svc.details}</p>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <span>Renewal Date</span>
                    <span className="text-[#041635]">{svc.renewal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Additions Catalog */}
          <div className="bg-[#041635] text-white p-8 rounded-3xl space-y-6">
            <h3 className="font-outfit text-xl font-black">Need Extra Cyber or Infrastructure Capabilities?</h3>
            <p className="text-sm text-slate-300 max-w-2xl">CYVRIX offers simple flat scoped add-ons covering network architecture stabilization, cloud tenant hardening, backup continuity audits, and business VoIP calling.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "M365 Tenant Hardening", cost: "Fixed Scope" },
                { title: "Resilient Wi-Fi segments", cost: "Scope Surveyed" },
                { title: "Secure Cloud Backups", cost: "Monthly retainer" }
              ].map((opt) => (
                <div key={opt.title} className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between h-40">
                  <div>
                    <h5 className="font-bold text-sm">{opt.title}</h5>
                    <p className="text-xs text-slate-400 font-bold mt-1">{opt.cost}</p>
                  </div>
                  <Link 
                    href="/book-consultation"
                    className="w-full py-2 bg-white text-[#041635] hover:bg-slate-100 font-bold text-xs rounded-xl text-center transition-all uppercase tracking-wider block"
                  >
                    Request Proposal
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. DOCUMENTS */}
      {module === "documents" && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div>
                <h3 className="font-outfit text-xl font-black text-[#041635]">Secure Client Document Vault</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Access audit-ready policies, SLAs, system architecture logs, and credentials shared with your organization.</p>
              </div>
              <span className="text-xs font-bold bg-[#EAF4FF] text-[#2691F0] px-3 py-1 rounded-full font-black">
                {documents.length} secure files
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-3">
                <FolderOpen className="h-12 w-12 mx-auto opacity-30" />
                <p className="font-bold text-sm">No shared documents found in your organization vault.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 font-bold text-sm transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-[#2691F0] group-hover:bg-[#EAF4FF] transition-all">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[#041635] font-black line-clamp-1">{doc.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Uploaded {new Date(doc.createdAt).toLocaleDateString("en-GB")}</p>
                      </div>
                    </div>

                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-[#2691F0] hover:border-[#2691F0] transition-all"
                    >
                      <Download className="h-4.5 w-4.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#EAF4FF] p-8 rounded-3xl border border-blue-100 text-[#041635]">
            <h4 className="font-outfit text-md font-black flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-[#2691F0]" />
              Secure Cryptographic File Delivery
            </h4>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              All documents published in your vault are kept inside encrypted private buckets with temporal signed URLs. Under no circumstances should you distribute sensitive architecture maps or credentials outside authorization chains.
            </p>
          </div>
        </div>
      )}

      {/* 6. NOTIFICATIONS */}
      {module === "notifications" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div>
              <h3 className="font-outfit text-xl font-black text-[#041635]">Inbox Notifications</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Real-time status updates on active tickets, quotes, and audit completions.</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{notifications.length} message{notifications.length !== 1 && "s"}</span>
          </div>

          {notifications.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <Bell className="h-12 w-12 mx-auto opacity-30 animate-pulse" />
              <p className="font-bold text-sm">Your inbox is currently clear.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => (
                <div key={notif.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4 hover:bg-slate-50/20 px-4 rounded-xl transition-all">
                  <div className={`p-2 rounded-xl mt-1 shrink-0 ${
                    notif.is_read ? "bg-slate-50 text-slate-400" : "bg-blue-50 text-[#2691F0]"
                  }`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="font-bold text-sm flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-[#041635] font-black">{notif.title}</p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {notif.created_at ? new Date(notif.created_at).toLocaleDateString("en-GB") : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
