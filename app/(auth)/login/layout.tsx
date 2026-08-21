import type { Metadata } from "next";

// The sign-in page is a Client Component, so its metadata is declared here.
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the CYVRIX client portal or administration area.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
