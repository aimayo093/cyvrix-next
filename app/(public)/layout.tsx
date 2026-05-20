import * as React from "react";
import { Navbar } from "@/components/nav-main/Navbar";
import { Footer } from "@/components/nav-main/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
