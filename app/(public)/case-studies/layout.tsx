import type { Metadata } from "next";

// The case-studies index is a Client Component, so its metadata is declared here.
export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Client work published by CYVRIX once the evidence, outcomes and publication permission have been reviewed.",
};

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
