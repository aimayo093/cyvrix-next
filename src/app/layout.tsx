import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import PageWrapper from "@/components/layout/PageWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cyvrix.co.uk"),
  title: {
    default: "CYVRIX Technologies | Managed IT, Cybersecurity and Cloud Consultancy",
    template: "%s | CYVRIX Technologies"
  },
  description: "CYVRIX Technologies provides managed IT support, cybersecurity, cloud, infrastructure, hardware support, and digital transformation consultancy for growing UK businesses.",
  keywords: ["managed IT support UK", "cybersecurity consultancy", "cloud migration", "Microsoft 365 security", "IT consultancy", "CYVRIX Technologies"],
  authors: [{ name: "CYVRIX Technologies" }],
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.cyvrix.co.uk",
    siteName: "CYVRIX Technologies",
    images: [{
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "CYVRIX Technologies"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "CYVRIX Technologies",
    description: "Managed IT support, cybersecurity and cloud consultancy for UK businesses.",
    images: ["/og-image.jpg"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <PageWrapper>
          {children}
        </PageWrapper>
      </body>
    </html>
  );
}
