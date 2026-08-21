type ServiceJourney = {
  category: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

const journeys: Record<string, ServiceJourney> = {
  "managed-it-support": {
    category: "Managed IT Services",
    primaryHref: "/book-consultation?service=Managed%20Services",
    primaryLabel: "Discuss managed support",
    secondaryHref: "/assessments/it-health-check",
    secondaryLabel: "Start an IT health check",
  },
  "endpoint-management": {
    category: "Managed IT Services",
    primaryHref: "/book-consultation?service=Managed%20Services",
    primaryLabel: "Discuss endpoint management",
    secondaryHref: "/assessments/it-health-check",
    secondaryLabel: "Start an IT health check",
  },
  "backup-and-disaster-recovery": {
    category: "Managed IT Services",
    primaryHref: "/book-consultation?service=Managed%20Services",
    primaryLabel: "Discuss recovery planning",
    secondaryHref: "/assessments/it-health-check",
    secondaryLabel: "Start an IT health check",
  },
  "microsoft-365-google-workspace-support": {
    category: "Cloud Services",
    primaryHref: "/book-consultation?service=Cloud%20Services",
    primaryLabel: "Discuss collaboration support",
    secondaryHref: "/assessments/microsoft-365-security",
    secondaryLabel: "Start a Microsoft 365 assessment",
  },
  "cybersecurity-services": {
    category: "Cybersecurity",
    primaryHref: "/book-consultation?service=Cybersecurity",
    primaryLabel: "Discuss cybersecurity",
    secondaryHref: "/assessments/cybersecurity-assessment",
    secondaryLabel: "Start a security assessment",
  },
  "compliance-risk-advisory": {
    category: "Cybersecurity",
    primaryHref: "/book-consultation?service=Cybersecurity",
    primaryLabel: "Discuss security readiness",
    secondaryHref: "/assessments/cybersecurity-assessment",
    secondaryLabel: "Start a security assessment",
  },
  "cloud-solutions": {
    category: "Cloud Services",
    primaryHref: "/book-consultation?service=Cloud%20Services",
    primaryLabel: "Discuss cloud work",
    secondaryHref: "/assessments/cloud-readiness",
    secondaryLabel: "Start a cloud readiness assessment",
  },
  "network-infrastructure": {
    category: "Infrastructure",
    primaryHref: "/book-consultation?service=Infrastructure",
    primaryLabel: "Discuss infrastructure",
    secondaryHref: "/assessments/network-assessment",
    secondaryLabel: "Start a network assessment",
  },
  "voip-business-communications": {
    category: "Infrastructure",
    primaryHref: "/book-consultation?service=Infrastructure",
    primaryLabel: "Discuss communications infrastructure",
    secondaryHref: "/assessments/network-assessment",
    secondaryLabel: "Start a network assessment",
  },
  "hardware-repair-field-support": {
    category: "Field Engineering",
    primaryHref: "/book-consultation?service=Field%20Engineering",
    primaryLabel: "Discuss field delivery",
    secondaryHref: "/request-quote",
    secondaryLabel: "Request a scoped quote",
  },
  "it-consultancy": {
    category: "Professional Services",
    primaryHref: "/book-consultation?service=Professional%20Services",
    primaryLabel: "Discuss a project",
    secondaryHref: "/request-quote",
    secondaryLabel: "Request a scoped quote",
  },
  "web-app-digital-solutions": {
    category: "Professional Services",
    primaryHref: "/book-consultation?service=Professional%20Services",
    primaryLabel: "Discuss a digital project",
    secondaryHref: "/request-quote",
    secondaryLabel: "Request a scoped quote",
  },
};

const defaultJourney: ServiceJourney = {
  category: "Technology Services",
  primaryHref: "/book-consultation?service=General%20Technology%20Review",
  primaryLabel: "Book a Free Review",
  secondaryHref: "/assessments",
  secondaryLabel: "Explore assessments",
};

export function getServiceJourney(slug: string): ServiceJourney {
  return journeys[slug] ?? defaultJourney;
}
