import {
  Activity,
  BriefcaseBusiness,
  Building2,
  Cloud,
  DatabaseBackup,
  FileLock2,
  GraduationCap,
  Headphones,
  HeartPulse,
  Laptop,
  Network,
  PhoneCall,
  Rocket,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

export type Service = {
  slug: string;
  title: string;
  summary: string;
  icon: typeof ShieldCheck;
  includes: string[];
  audience: string;
  problems: string[];
  features: string[];
  process: string[];
  compliance: string;
  faqs: { question: string; answer: string }[];
};

export type Industry = {
  slug: string;
  title: string;
  icon: typeof Building2;
  challenges: string[];
  help: string;
  solutions: string[];
  services: string[];
};

export const siteSettings = {
  companyName: "CYVRIX Technologies",
  tradingName: "CYVRIX Technologies",
  supportEmail: "",
  phone: "",
  address: "",
  coverage: "",
  social: ["LinkedIn", "X", "GitHub"],
};

export const stats: never[] = [];

export const services: Service[] = [
  {
    slug: "managed-it-support",
    title: "Managed IT Support",
    summary: "Proactive helpdesk, monitoring, device management, vendor coordination, and practical IT ownership for growing teams.",
    icon: Headphones,
    includes: ["Remote helpdesk and escalation", "Device and endpoint management", "Patch and asset routines", "User onboarding and offboarding", "Monthly service reviews"],
    audience: "SMEs, care providers, professional services, and operational teams that need responsive IT without building a large internal function.",
    problems: ["Recurring IT interruptions", "Slow ticket resolution", "Unclear ownership across suppliers", "Unmanaged laptops and mobile devices"],
    features: ["Ticket tracking and escalation workflow", "Endpoint visibility", "Procurement advice", "Client portal"],
    process: ["Discovery and access review", "Stabilise critical systems", "Document assets and support flows", "Operate helpdesk and monitoring", "Improve through service reviews"],
    compliance: "Support routines are designed around least privilege, audit trails, account hygiene, and clear handling of client data.",
    faqs: [
      { question: "Can CYVRIX support hybrid teams?", answer: "Yes. The support model covers remote users, office networks, and agreed onsite work where needed." },
      { question: "Do we need a long contract?", answer: "Engagement terms can be shaped around the support model, project scope and urgency involved." },
    ],
  },
  {
    slug: "cybersecurity-services",
    title: "Cybersecurity Services",
    summary: "Risk assessment, endpoint protection, vulnerability management, awareness, incident readiness, and security hardening.",
    icon: ShieldCheck,
    includes: ["Security baseline review", "Endpoint and identity hardening", "Vulnerability remediation planning", "Security awareness guidance", "Incident response readiness"],
    audience: "UK organisations that need stronger controls, board-level clarity, and practical protection without security theatre.",
    problems: ["Weak Microsoft 365 configuration", "Poor password and MFA coverage", "No incident plan", "Unpatched assets", "Limited security visibility"],
    features: ["MFA and conditional access review", "Secure endpoint standards", "Backup and recovery alignment", "Risk register", "Executive reporting"],
    process: ["Assess exposure", "Prioritise quick wins", "Harden identity and endpoints", "Document response plans", "Review and improve"],
    compliance: "Aligned with UK GDPR principles, Cyber Essentials readiness, and sensible evidence capture for audits.",
    faqs: [
      { question: "Is this only for large companies?", answer: "No. The service is built for SMEs that need focused security improvement with commercial pragmatism." },
      { question: "Can you help after an incident?", answer: "CYVRIX can support containment planning and recovery coordination, with specialist partners where appropriate." },
    ],
  },
  {
    slug: "cloud-solutions",
    title: "Cloud Solutions",
    summary: "Microsoft 365, Google Workspace, backup, migration, secure configuration, and cloud adoption planning.",
    icon: Cloud,
    includes: ["Tenant configuration", "Migration planning", "Identity and access controls", "Cloud backup", "Admin training"],
    audience: "Businesses modernising collaboration, replacing legacy servers, or improving security across Microsoft and Google environments.",
    problems: ["Messy tenants", "Poor sharing controls", "Mailbox migration risk", "Licensing waste", "Unclear backup coverage"],
    features: ["Migration runbooks", "Secure collaboration settings", "License reviews", "Cloud backup strategy", "Admin documentation"],
    process: ["Map current state", "Design target controls", "Pilot migration", "Move workloads", "Optimise and document"],
    compliance: "Data residency, retention, access control, and audit logging are considered before production changes.",
    faqs: [
      { question: "Can you migrate from Google to Microsoft 365?", answer: "Yes. The migration plan covers mail, files, identities, devices, and user communications." },
      { question: "Do we still need backup in cloud platforms?", answer: "Usually yes. Cloud availability is not the same as recoverable business backup." },
    ],
  },
  {
    slug: "network-infrastructure",
    title: "Network Infrastructure",
    summary: "Business-grade Wi-Fi, firewalls, switching, VPN, connectivity planning, and resilient office networks.",
    icon: Network,
    includes: ["Firewall and VPN setup", "Switching and VLAN design", "Secure Wi-Fi", "Office connectivity", "Documentation and handover"],
    audience: "Offices, clinics, warehouses, retail sites, and field teams that need stable connectivity and segmented access.",
    problems: ["Unreliable Wi-Fi", "Flat insecure networks", "Poor guest access", "Remote access gaps", "Undocumented hardware"],
    features: ["Network diagrams", "Segmentation", "Firewall rules", "Guest Wi-Fi", "Resilience planning"],
    process: ["Survey", "Design", "Configure", "Deploy", "Monitor"],
    compliance: "Networks are designed with segmentation, admin access control, logging, and secure remote access practices.",
    faqs: [
      { question: "Do you support multi-site businesses?", answer: "Yes. Designs can cover offices, branches, warehouses, and remote users." },
      { question: "Can you work with existing hardware?", answer: "Where suitable, yes. CYVRIX will identify what can be retained and what creates risk." },
    ],
  },
  {
    slug: "it-consultancy",
    title: "IT Consultancy",
    summary: "Technology strategy, procurement, architecture review, compliance readiness, and transformation project leadership.",
    icon: BriefcaseBusiness,
    includes: ["Technology roadmap", "Supplier and licensing review", "Architecture recommendations", "Project planning", "Board-ready reporting"],
    audience: "Leadership teams that need a clear technology plan before investing in platforms, infrastructure, or security controls.",
    problems: ["Unclear IT direction", "Supplier lock-in", "Budget uncertainty", "Aging systems", "Compliance pressure"],
    features: ["Current-state assessment", "Prioritised roadmap", "Risk and cost view", "Project governance", "Procurement guidance"],
    process: ["Discover", "Assess", "Recommend", "Plan", "Support delivery"],
    compliance: "Recommendations include data protection, resilience, access control, and operational risk considerations.",
    faqs: [
      { question: "Can you work alongside our internal IT team?", answer: "Yes. CYVRIX can provide independent review, project delivery, or extra capacity." },
      { question: "Will we get a written roadmap?", answer: "Yes. Consultancy engagements can include a practical roadmap and board-level summary." },
    ],
  },
  {
    slug: "backup-and-disaster-recovery",
    title: "Backup and Disaster Recovery",
    summary: "Data protection, recovery planning, continuity testing, and backup coverage across cloud, endpoint, and server environments.",
    icon: DatabaseBackup,
    includes: ["Backup coverage review", "Recovery objectives", "Restore testing", "Continuity planning", "Ransomware-aware controls"],
    audience: "Businesses that cannot afford data loss, prolonged downtime, or unclear recovery ownership.",
    problems: ["No tested restores", "Single backup location", "Cloud data gaps", "Unclear RTO/RPO", "Ransomware exposure"],
    features: ["Recovery runbooks", "Immutable backup options", "Restore tests", "Backup reports", "Continuity guidance"],
    process: ["Identify critical data", "Set recovery targets", "Implement backup", "Test restoration", "Review regularly"],
    compliance: "Plans are built around recoverability, retention, access control, and evidence that backups actually work.",
    faqs: [
      { question: "How often should backups be tested?", answer: "Critical systems should be tested routinely, with frequency based on risk and service tier." },
      { question: "Can you cover Microsoft 365?", answer: "Yes. Microsoft 365 backup strategy can be included in the service." },
    ],
  },
  {
    slug: "microsoft-365-google-workspace-support",
    title: "Microsoft 365 and Google Workspace Support",
    summary: "Secure configuration, user support, licensing, migration, email protection, and productivity platform administration.",
    icon: Laptop,
    includes: ["Tenant support", "User lifecycle", "Mailbox and drive controls", "Licensing review", "Email security"],
    audience: "Teams standardising collaboration while keeping identity, sharing, and devices under control.",
    problems: ["License overspend", "Poor offboarding", "Inconsistent sharing", "Email security gaps", "Admin sprawl"],
    features: ["MFA coverage", "Admin role review", "Secure sharing defaults", "Mailbox protection", "Lifecycle checklists"],
    process: ["Audit", "Harden", "Standardise", "Support", "Review"],
    compliance: "CYVRIX focuses on access control, retention, logging, and privacy-aware administration.",
    faqs: [
      { question: "Can you manage licensing?", answer: "Yes. CYVRIX can review licensing and recommend right-sized plans." },
      { question: "Can you improve email security?", answer: "Yes. SPF, DKIM, DMARC, anti-phishing settings, and user guidance can be included." },
    ],
  },
  {
    slug: "endpoint-management",
    title: "Endpoint Management",
    summary: "Device standards, patching, encryption, software deployment, inventory, and secure user onboarding.",
    icon: Activity,
    includes: ["Asset inventory", "Patch routines", "Encryption checks", "Software deployment", "Device compliance"],
    audience: "Organisations with laptops, desktops, tablets, and mobile devices spread across office and remote teams.",
    problems: ["Unknown device estate", "Unpatched machines", "Lost device risk", "Manual setup", "Inconsistent security"],
    features: ["Device baselines", "Patch reporting", "MDM-ready policies", "Remote support", "Offboarding workflows"],
    process: ["Inventory", "Baseline", "Enroll", "Monitor", "Improve"],
    compliance: "Endpoint routines support least privilege, encryption, data loss reduction, and audit evidence.",
    faqs: [
      { question: "Can you support BYOD?", answer: "Yes, with a clear policy and controls that protect company data." },
      { question: "Do you provide device procurement?", answer: "CYVRIX can advise on procurement and standard builds." },
    ],
  },
  {
    slug: "hardware-repair-field-support",
    title: "Hardware Repair and Field Support",
    summary: "Practical support for devices, peripherals, office hardware, diagnostics, replacement planning, and onsite coordination.",
    icon: Wrench,
    includes: ["Diagnostics", "Warranty coordination", "Replacement advice", "Onsite support planning", "Asset lifecycle guidance"],
    audience: "Teams that need reliable deskside support, field equipment help, or hardware lifecycle planning.",
    problems: ["Slow device swaps", "Unclear warranties", "Failing peripherals", "No lifecycle plan", "Site support gaps"],
    features: ["Asset notes", "Repair triage", "Procurement standards", "Field support scheduling", "Secure disposal guidance"],
    process: ["Triage", "Diagnose", "Repair or replace", "Document", "Improve standards"],
    compliance: "Secure handling and disposal practices are built into device replacement and repair workflows.",
    faqs: [
      { question: "Do you repair all hardware in-house?", answer: "CYVRIX triages and coordinates repair, replacement, or specialist support based on risk and warranty status." },
      { question: "Can you support field teams?", answer: "Yes. Field support can cover laptops, mobile devices, connectivity, and accessories." },
    ],
  },
  {
    slug: "voip-business-communications",
    title: "VoIP and Business Communications",
    summary: "Business calling, Teams Phone readiness, call routing, device advice, and communications continuity.",
    icon: PhoneCall,
    includes: ["VoIP readiness review", "Call flow design", "User setup", "Number migration planning", "Continuity guidance"],
    audience: "Businesses replacing legacy phone systems or improving hybrid team communications.",
    problems: ["Legacy PBX costs", "Poor call routing", "No remote calling", "Missed customer calls", "Unclear continuity"],
    features: ["Call queues", "Auto attendants", "Teams Phone planning", "SIP/provider coordination", "User training"],
    process: ["Assess", "Design", "Port", "Deploy", "Support"],
    compliance: "Voice systems are considered alongside access control, recording policy, retention, and business continuity.",
    faqs: [
      { question: "Can you support Teams Phone?", answer: "Yes. CYVRIX can assess readiness and coordinate implementation." },
      { question: "Can we keep existing numbers?", answer: "Usually, with porting subject to provider and contract conditions." },
    ],
  },
  {
    slug: "compliance-risk-advisory",
    title: "Compliance and Risk Advisory",
    summary: "Practical controls, evidence, policies, supplier risk, data protection support, and audit-readiness improvement.",
    icon: Scale,
    includes: ["Control mapping", "Policy review", "Risk register", "Supplier review", "Evidence preparation"],
    audience: "Businesses preparing for Cyber Essentials, client questionnaires, insurance reviews, or governance improvement.",
    problems: ["Audit pressure", "Missing evidence", "Weak policies", "Supplier uncertainty", "Security questionnaires"],
    features: ["Evidence pack", "Risk prioritisation", "Policy templates", "Improvement roadmap", "Executive summary"],
    process: ["Scope", "Assess", "Map controls", "Close gaps", "Maintain evidence"],
    compliance: "Advice is practical and technology-led, with legal review recommended for formal legal documents.",
    faqs: [
      { question: "Do you provide legal advice?", answer: "No. CYVRIX supports technical and operational readiness; formal legal documents should be reviewed by a qualified legal professional." },
      { question: "Can this support Cyber Essentials?", answer: "Yes. CYVRIX can help identify and remediate common Cyber Essentials readiness gaps." },
    ],
  },
  {
    slug: "web-app-digital-solutions",
    title: "Web, App, and Digital Solutions",
    summary: "Secure websites, internal tools, automation, integrations, digital workflow improvement, and product delivery advice.",
    icon: Rocket,
    includes: ["Discovery", "UX and product planning", "Secure build guidance", "Integration planning", "Operational handover"],
    audience: "Businesses that need better digital workflows, customer portals, internal systems, or secure web platforms.",
    problems: ["Manual processes", "Disconnected systems", "Poor user experience", "Security concerns", "No product roadmap"],
    features: ["Workflow mapping", "Prototype planning", "Secure architecture", "Analytics readiness", "Support handover"],
    process: ["Discover", "Design", "Build", "Secure", "Improve"],
    compliance: "Digital projects include security, privacy, accessibility, and maintainability from the start.",
    faqs: [
      { question: "Can CYVRIX build client portals?", answer: "Yes. CYVRIX can plan and deliver secure portals and internal applications." },
      { question: "Do you support existing websites?", answer: "Yes, subject to stack review and access quality." },
    ],
  },
];

export const industries: Industry[] = [
  { slug: "small-medium-businesses", title: "Small and Medium Businesses", icon: Building2, challenges: ["No internal IT lead", "Supplier sprawl", "Security gaps"], help: "CYVRIX gives SMEs a dependable technology function without enterprise overhead.", solutions: ["Managed support", "Microsoft 365 hardening", "Backup and recovery"], services: ["Managed IT Support", "Cybersecurity Services", "IT Consultancy"] },
  { slug: "healthcare-care-providers", title: "Healthcare and Care Providers", icon: HeartPulse, challenges: ["Sensitive data", "Device reliability", "Regulatory pressure"], help: "CYVRIX supports secure access, resilient devices, and practical data protection controls.", solutions: ["Secure endpoints", "Guest and staff networks", "Backup testing"], services: ["Cybersecurity Services", "Network Infrastructure", "Backup and Disaster Recovery"] },
  { slug: "logistics-transport", title: "Logistics and Transport", icon: Truck, challenges: ["Distributed users", "Warehouse connectivity", "Operational downtime"], help: "CYVRIX stabilises connectivity, field devices, and support flows for fast-moving teams.", solutions: ["Wi-Fi and VPN", "Endpoint management", "Support portal"], services: ["Network Infrastructure", "Endpoint Management", "Managed IT Support"] },
  { slug: "professional-services", title: "Professional Services", icon: BriefcaseBusiness, challenges: ["Client confidentiality", "Email risk", "Hybrid working"], help: "CYVRIX helps firms protect client data while keeping consultants productive.", solutions: ["Identity hardening", "Email protection", "Secure collaboration"], services: ["Microsoft 365 and Google Workspace Support", "Cybersecurity Services", "Compliance and Risk Advisory"] },
  { slug: "retail-ecommerce", title: "Retail and E-commerce", icon: ShoppingCart, challenges: ["Payment-adjacent risk", "POS uptime", "Seasonal demand"], help: "CYVRIX supports secure operations, resilient networks, and practical recovery planning.", solutions: ["Network segmentation", "Backup", "Digital support"], services: ["Network Infrastructure", "Backup and Disaster Recovery", "Web, App, and Digital Solutions"] },
  { slug: "education-training", title: "Education and Training", icon: GraduationCap, challenges: ["User volume", "Safeguarding expectations", "Budget control"], help: "CYVRIX designs supportable systems for staff, learners, and administrators.", solutions: ["Workspace support", "Access controls", "Knowledge base"], services: ["Cloud Solutions", "Endpoint Management", "Managed IT Support"] },
  { slug: "construction-field-teams", title: "Construction and Field Teams", icon: Wrench, challenges: ["Rugged work environments", "Field connectivity", "Device loss"], help: "CYVRIX keeps site teams connected with resilient device and access practices.", solutions: ["Mobile device controls", "VoIP", "Field support"], services: ["Endpoint Management", "VoIP and Business Communications", "Hardware Repair and Field Support"] },
  { slug: "startups-saas-businesses", title: "Startups and SaaS Businesses", icon: Rocket, challenges: ["Fast scaling", "Investor due diligence", "Security maturity"], help: "CYVRIX gives growing companies credible security and infrastructure without slowing product delivery.", solutions: ["Security roadmap", "Cloud controls", "Automation"], services: ["Cybersecurity Services", "Cloud Solutions", "IT Consultancy"] },
  { slug: "finance-fintech", title: "Finance and Fintech", icon: FileLock2, challenges: ["High trust bar", "Audit evidence", "Access control"], help: "CYVRIX helps tighten identity, endpoint, and governance controls for sensitive operations.", solutions: ["MFA and access review", "Risk register", "Backup evidence"], services: ["Compliance and Risk Advisory", "Cybersecurity Services", "Backup and Disaster Recovery"] },
  { slug: "nonprofits-community", title: "Nonprofits and Community Organisations", icon: Users, challenges: ["Lean budgets", "Volunteer access", "Data protection"], help: "CYVRIX helps community organisations use secure, maintainable technology within realistic budgets.", solutions: ["Workspace setup", "Device standards", "Policy guidance"], services: ["Managed IT Support", "Cloud Solutions", "Compliance and Risk Advisory"] },
];

export type ServiceProductPriceDisplayMode = "EXACT" | "FROM" | "REQUEST_PRICING" | "HIDDEN";

export type ServiceProduct = {
  name: string;
  recommendedCustomerSize: string;
  cadence: string;
  summary: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  pricingVisible: boolean;
  priceDisplayMode: ServiceProductPriceDisplayMode;
  monthlyPrice: string | null;
  annualPrice: string | null;
};

export const productisedServicePlans: ServiceProduct[] = [
  {
    name: "Managed IT Essential",
    recommendedCustomerSize: "Smaller organisations establishing a dependable support baseline.",
    cadence: "Managed monthly service",
    summary: "A clear starting point for day-to-day user support, device care and practical technology ownership.",
    features: ["User support and request coordination", "Device inventory and support standards", "Patch and endpoint routines", "Supplier and warranty coordination"],
    cta: "Discuss Essential",
    href: "/book-consultation?service=Managed%20Services",
    pricingVisible: false,
    priceDisplayMode: "REQUEST_PRICING",
    monthlyPrice: null,
    annualPrice: null,
  },
  {
    name: "Managed IT Business",
    recommendedCustomerSize: "Growing teams that need consistent support, oversight and improvement planning.",
    cadence: "Managed monthly service",
    summary: "A broader managed service for organisations that need technology support to work alongside their growth plans.",
    features: ["Everything in Essential", "Microsoft 365 administration support", "Security and access-control review routines", "Regular service and improvement reviews"],
    cta: "Discuss Business",
    href: "/book-consultation?service=Managed%20Services",
    featured: true,
    pricingVisible: false,
    priceDisplayMode: "REQUEST_PRICING",
    monthlyPrice: null,
    annualPrice: null,
  },
  {
    name: "Managed IT Complete",
    recommendedCustomerSize: "Organisations seeking a more comprehensive outsourced technology function.",
    cadence: "Managed monthly service",
    summary: "A managed technology partnership shaped around wider ownership, resilience and specialist delivery needs.",
    features: ["Everything in Business", "Technology roadmap and project governance", "Infrastructure and supplier coordination", "Planned onsite and specialist delivery"],
    cta: "Discuss Complete",
    href: "/book-consultation?service=Managed%20Services",
    pricingVisible: false,
    priceDisplayMode: "REQUEST_PRICING",
    monthlyPrice: null,
    annualPrice: null,
  },
];

// Existing CMS pricing blocks use this compatible, public-safe projection.
export const pricingPackages = productisedServicePlans.map((plan) => ({
  name: plan.name,
  cadence: plan.cadence,
  visible: true,
  summary: plan.summary,
  features: plan.features,
  cta: plan.cta,
  href: plan.href,
  featured: plan.featured,
}));

// Public proof is published only through the verified Trust & Credentials workflow.
export const caseStudies: never[] = [];
export const testimonials: never[] = [];

export const faqs = [
  { category: "Managed IT Support", question: "Can CYVRIX act as our outsourced IT department?", answer: "Yes. CYVRIX can provide helpdesk, device management, supplier coordination, documentation, and service reviews." },
  { category: "Cybersecurity", question: "Do you support Cyber Essentials readiness?", answer: "CYVRIX can identify and remediate common readiness gaps, though certification decisions remain with the certification body." },
  { category: "Cloud Services", question: "Can you support both Microsoft 365 and Google Workspace?", answer: "Yes. Support covers secure configuration, users, migrations, licensing, and admin routines." },
  { category: "Pricing and Contracts", question: "Are prices fixed on the website?", answer: "Pricing visibility is controlled in admin because packages should reflect service scope, users, sites, and risk." },
  { category: "Emergency Support", question: "Can non-clients request urgent help?", answer: "Yes. The support form captures urgency and whether the requester is an existing client." },
  { category: "Onboarding", question: "What happens during onboarding?", answer: "CYVRIX reviews access, assets, suppliers, risks, priority tickets, and documentation before service starts." },
  { category: "Data Protection", question: "Do you provide legal documents?", answer: "CYVRIX can support technical controls and editable policy content, but final legal documents should be reviewed by a qualified legal professional." },
  { category: "Hardware Support", question: "Can you help with hardware procurement and repair?", answer: "Yes. CYVRIX can triage issues, advise on repair or replacement, and coordinate warranties or field support." },
];

import { insightArticles } from "@/lib/insight-content";

export { insightArticles as blogPosts };

export const legalPages = [
  { slug: "privacy-policy", title: "Privacy Policy", summary: "How CYVRIX Technologies handles personal data, enquiries, client records, and website information.", sections: ["Data collected through website forms", "Client and support records", "Retention and access controls", "Processor and supplier considerations", "Your rights under UK GDPR"] },
  { slug: "terms-of-service", title: "Terms of Service", summary: "Commercial terms for using CYVRIX websites, portals, and engagement workflows.", sections: ["Website use", "Consultation requests", "Client portal responsibilities", "Acceptable behaviour", "Limitations and professional review"] },
  { slug: "cookie-policy", title: "Cookie Policy", summary: "How essential, analytics, and preference cookies can be configured.", sections: ["Essential cookies", "Analytics configuration", "Consent preferences", "Admin-managed tracking IDs"] },
  { slug: "acceptable-use-policy", title: "Acceptable Use Policy", summary: "Expected conduct for portal users and client-facing systems.", sections: ["No unlawful use", "No unauthorised access", "Responsible uploads", "Account security"] },
  { slug: "data-processing-addendum", title: "Data Processing Addendum", summary: "Available only after legal review and agreement for the relevant engagement.", sections: ["Processing scope", "Security measures", "Sub-processors", "Incident notification", "Legal review required"] },
  { slug: "service-level-agreement", title: "Service Level Agreement Overview", summary: "High-level service level concepts for managed support engagements.", sections: ["Priority categories", "Response targets", "Client responsibilities", "Exclusions", "Review cadence"] },
];

export const jobs = [
  { title: "IT Support Engineer", location: "UK remote/hybrid", type: "Future opening", summary: "Support users, endpoints, cloud platforms, and client service routines." },
  { title: "Cybersecurity Consultant", location: "UK remote/hybrid", type: "Future opening", summary: "Deliver security reviews, hardening plans, and practical risk reporting." },
];

export const landingPages = [
  { slug: "cybersecurity-audit", title: "Cybersecurity Audit for Growing UK Businesses", service: "Cybersecurity Services", outcome: "Understand your highest-risk gaps and leave with a prioritised security roadmap." },
  { slug: "managed-it-support", title: "Managed IT Support Without the Enterprise Overhead", service: "Managed IT Support", outcome: "Give your team a reliable support desk, documented estate, and proactive improvement plan." },
  { slug: "cloud-migration", title: "Plan a Safer Cloud Migration", service: "Cloud Solutions", outcome: "Move users, data, and collaboration tools with less disruption and stronger controls." },
  { slug: "microsoft-365-hardening", title: "Microsoft 365 Hardening Sprint", service: "Microsoft 365 and Google Workspace Support", outcome: "Tighten identity, admin roles, sharing, email security, and backup assumptions." },
  { slug: "backup-disaster-recovery", title: "Backup and Disaster Recovery Review", service: "Backup and Disaster Recovery", outcome: "Know what you can restore, how fast, and what still needs attention." },
];

export const adminModules = [
  "Dashboard", "Website CMS", "Page Builder", "Media Library", "Services CMS", "Industries CMS", "Blog and Insights", "FAQ CMS", "Pricing Packages", "Legal Pages", "Careers", "Leads CRM", "Quote Requests", "Ticket Management", "Client Management", "Client Documents", "Testimonials", "Navigation Menus", "Footer Content", "Settings", "Audit Logs", "User and Role Management",
];

export const adminModuleDetails = [
  {
    name: "Website CMS",
    description: "Manage homepage sections, about content, CTA blocks, SEO metadata, navigation, footer content, testimonials, stats, and visibility.",
    records: ["Homepage hero", "Services overview", "Why CYVRIX", "Final CTA"],
    fields: ["Title", "Hero title", "Hero subtitle", "Button label", "Button link", "Visibility", "Sort order", "SEO title", "SEO description"],
  },
  {
    name: "Page Builder",
    description: "Build flexible CMS pages with reusable blocks and clean publishing controls.",
    records: ["Homepage", "About", "Careers", "Custom landing page"],
    fields: ["Title", "Slug", "Hero title", "Featured image", "Content block type", "Block JSON", "Published status", "Open Graph image"],
  },
  {
    name: "Media Library",
    description: "Upload, replace, categorise, caption, preview, and reuse images in CMS content.",
    records: ["Logo", "Service hero", "Case study image", "Open Graph asset"],
    fields: ["File", "Filename", "Alt text", "Caption", "Category", "Folder", "Replace image", "Delete confirmation"],
  },
  {
    name: "Services CMS",
    description: "Create, edit, publish, hide, reorder, and optimise CYVRIX services.",
    records: services.slice(0, 5).map((service) => service.title),
    fields: ["Name", "Slug", "Short description", "Full description", "Icon", "Features", "Benefits", "Delivery process", "Related services", "FAQ", "SEO"],
  },
  {
    name: "Industries CMS",
    description: "Manage industry pages, challenges, relevant services, examples, and calls to action.",
    records: industries.slice(0, 5).map((industry) => industry.title),
    fields: ["Title", "Slug", "Challenges", "How CYVRIX helps", "Relevant services", "Example solutions", "Sort order", "Published status"],
  },
  {
    name: "Blog and Insights",
    description: "Publish practical security, cloud, MSP, continuity, and UK SME IT guidance.",
    records: insightArticles.map((post) => post.title),
    fields: ["Title", "Slug", "Excerpt", "Body", "Author", "Category", "Tags", "Featured image", "Publish date", "SEO"],
  },
  {
    name: "FAQ CMS",
    description: "Maintain categorised FAQs used across public FAQ pages and service pages.",
    records: faqs.slice(0, 5).map((faq) => faq.question),
    fields: ["Question", "Answer", "Category", "Sort order", "Published status"],
  },
  {
    name: "Leads CRM",
    description: "Track contact submissions, quote requests, consultation requests, statuses, assignment, and notes.",
    records: ["New website enquiry", "Consultation request", "Security audit lead", "Cloud migration lead"],
    fields: ["Lead status", "Assigned staff", "Follow-up date", "Notes", "Conversion status", "Archive"],
  },
  {
    name: "Ticket Management",
    description: "Manage public and client support tickets, status, priority, assignment, notes, replies, and SLA state.",
    records: ["CYV-TKT-000001", "CYV-TKT-000002", "CYV-TKT-000003"],
    fields: ["Status", "Priority", "Category", "Assigned user", "Internal note", "Client reply", "Attachment"],
  },
  {
    name: "Settings",
    description: "Control company details, brand colours, SEO defaults, email settings, analytics, cookies, and maintenance mode.",
    records: ["Company profile", "Branding", "SEO defaults", "Email notifications"],
    fields: ["Company name", "Trading name", "Website URL", "Contact email", "Phone", "Address", "Logo", "Favicon", "Analytics ID"],
  },
];

export function findAdminModule(nameOrSlug: string) {
  const normalized = nameOrSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return adminModuleDetails.find((module) => module.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === normalized);
}

export const portalModules = [
  "Profile and Company", "Support Tickets", "Quotes and Proposals", "Services", "Knowledge Base", "Documents", "Notifications",
];

export function findService(slug: string) {
  return services.find((service) => service.slug === slug);
}

export function findIndustry(slug: string) {
  return industries.find((industry) => industry.slug === slug);
}
