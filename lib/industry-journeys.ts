export type IndustryJourney = {
  securityFocus: string[];
  infrastructureFocus: string[];
  cloudFocus: string[];
  continuityFocus: string[];
  consultationHref: string;
};

const defaultJourney: IndustryJourney = {
  securityFocus: ["Protect identities and administrator access", "Maintain clear device and data-handling standards"],
  infrastructureFocus: ["Keep the core network and end-user estate supportable", "Document ownership across systems and suppliers"],
  cloudFocus: ["Review collaboration controls and retention", "Plan change around people, process and operational risk"],
  continuityFocus: ["Identify critical systems and recovery dependencies", "Test whether the organisation can operate through a disruption"],
  consultationHref: "/book-consultation?service=Managed%20Services",
};

const industryJourneys: Record<string, IndustryJourney> = {
  "small-medium-businesses": {
    securityFocus: ["Strengthen identity, device and email controls without creating unnecessary overhead", "Set clear responsibilities across users, suppliers and internal owners"],
    infrastructureFocus: ["Standardise the estate before it becomes difficult to support", "Remove single points of failure in connectivity and core systems"],
    cloudFocus: ["Bring Microsoft 365 or Google Workspace administration under control", "Align sharing, backup and licensing with how teams work"],
    continuityFocus: ["Clarify what must be restored first after disruption", "Make recovery ownership and supplier escalation practical"],
    consultationHref: "/book-consultation?service=Managed%20Services",
  },
  "healthcare-care-providers": {
    securityFocus: ["Protect access to sensitive records and shared devices", "Use clear account, device and administrative access routines"],
    infrastructureFocus: ["Support dependable coverage across care, office and clinical spaces", "Segment staff, guest and operational connectivity appropriately"],
    cloudFocus: ["Review secure collaboration and data access before changing platforms", "Maintain practical administration around shift-based teams"],
    continuityFocus: ["Understand the effect of outages on care delivery and communications", "Plan recovery around the services people depend on first"],
    consultationHref: "/book-consultation?service=Cybersecurity",
  },
  "logistics-transport": {
    securityFocus: ["Control access across mobile, warehouse and office devices", "Reduce avoidable email and identity risk across distributed teams"],
    infrastructureFocus: ["Improve coverage and resilience at operational sites", "Document dependencies between connectivity, devices and line-of-business systems"],
    cloudFocus: ["Support secure collaboration between office, dispatch and field users", "Review SaaS access and device lifecycle controls"],
    continuityFocus: ["Prioritise systems that keep orders, vehicles and warehouses moving", "Prepare realistic workarounds for connectivity disruption"],
    consultationHref: "/book-consultation?service=Infrastructure",
  },
  "professional-services": {
    securityFocus: ["Protect client information through identity, sharing and email controls", "Keep access rights aligned with joiners, movers and leavers"],
    infrastructureFocus: ["Provide dependable hybrid working and meeting-room connectivity", "Keep the user estate straightforward for an often mobile workforce"],
    cloudFocus: ["Make Microsoft 365 or Google Workspace administration consistent", "Review retention and secure collaboration around client work"],
    continuityFocus: ["Identify the systems required to serve clients during a disruption", "Keep supplier, document and communication dependencies visible"],
    consultationHref: "/book-consultation?service=Managed%20Services",
  },
  "retail-ecommerce": {
    securityFocus: ["Separate operational, staff and guest access where appropriate", "Reduce device and account exposure around customer-facing operations"],
    infrastructureFocus: ["Support stable connectivity for stores, back office and fulfilment", "Plan network changes around trading hours and operational windows"],
    cloudFocus: ["Coordinate access to commerce, collaboration and supplier platforms", "Maintain clear administration as teams and locations change"],
    continuityFocus: ["Prioritise trading, fulfilment and customer communication systems", "Prepare for outages that affect a site or key platform"],
    consultationHref: "/book-consultation?service=Infrastructure",
  },
  "education-training": {
    securityFocus: ["Manage user access at scale while maintaining clear safeguards", "Review device, email and collaboration controls for varied user groups"],
    infrastructureFocus: ["Provide reliable Wi-Fi and device support across learning spaces", "Plan capacity around the way learners and staff actually use technology"],
    cloudFocus: ["Standardise administration for teaching, learning and operational tools", "Keep storage, sharing and identity settings understandable"],
    continuityFocus: ["Protect teaching and operational continuity during a platform or site issue", "Define recovery priorities before an incident creates pressure"],
    consultationHref: "/book-consultation?service=Cloud%20Services",
  },
  "construction-field-teams": {
    securityFocus: ["Protect mobile devices, accounts and data beyond the office", "Make onboarding and offboarding workable for changing site teams"],
    infrastructureFocus: ["Support site connectivity, temporary offices and field equipment", "Plan deployments, replacements and site surveys with clear ownership"],
    cloudFocus: ["Give dispersed teams dependable access to documents and communications", "Maintain practical device and collaboration standards"],
    continuityFocus: ["Identify site operations affected by device or connectivity loss", "Keep critical project information accessible through disruption"],
    consultationHref: "/book-consultation?service=Field%20Engineering",
  },
  "startups-saas-businesses": {
    securityFocus: ["Improve identity, device and cloud controls as the business grows", "Prepare sensible evidence and risk visibility for customer or investor conversations"],
    infrastructureFocus: ["Keep internal systems scalable without accumulating unmanaged tools", "Clarify responsibilities between product, operations and suppliers"],
    cloudFocus: ["Review cloud administration, backups and access before growth introduces avoidable risk", "Plan platform changes with a practical migration and rollback approach"],
    continuityFocus: ["Understand dependencies that affect customer delivery", "Build recovery decisions into operational change rather than after an incident"],
    consultationHref: "/book-consultation?service=Cloud%20%26%20Cybersecurity",
  },
  "finance-fintech": {
    securityFocus: ["Maintain strong identity, endpoint and access-review practices", "Create usable evidence around technical controls and ownership"],
    infrastructureFocus: ["Document core services and segregate access where risk requires it", "Review resilience across user, network and supplier dependencies"],
    cloudFocus: ["Control cloud administration, collaboration and retention settings", "Approach changes with clear governance and change records"],
    continuityFocus: ["Prioritise the technology required to continue regulated operations", "Make recovery and escalation responsibilities clear before disruption"],
    consultationHref: "/book-consultation?service=Cybersecurity",
  },
  "nonprofits-community": {
    securityFocus: ["Protect donor, member and service-user information proportionately", "Manage staff and volunteer access with clear boundaries"],
    infrastructureFocus: ["Maintain supportable systems across limited internal capacity", "Improve connectivity and device consistency without unnecessary complexity"],
    cloudFocus: ["Use collaboration tools safely across employees, trustees and volunteers", "Review licensing and administration as teams change"],
    continuityFocus: ["Keep essential communications and service delivery available", "Understand which systems require recovery first"],
    consultationHref: "/book-consultation?service=Managed%20Services",
  },
};

export function getIndustryJourney(slug: string): IndustryJourney {
  return industryJourneys[slug] ?? defaultJourney;
}
