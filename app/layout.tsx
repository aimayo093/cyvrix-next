import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#041635",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "CYVRIX Technologies | Premium Managed IT & Cybersecurity",
    template: "%s | CYVRIX Technologies",
  },
  description: "Secure, dependable IT support and cybersecurity consultancy for growing UK businesses. Managed IT, cloud infrastructure, and digital transformation.",
  metadataBase: new URL("https://cyvrix.com"),
  keywords: ["Managed IT UK", "Cybersecurity Consultancy", "IT Support London", "Cloud Infrastructure", "CYVRIX"],
  authors: [{ name: "CYVRIX Technologies" }],
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://cyvrix.com",
    siteName: "CYVRIX Technologies",
    title: "CYVRIX Technologies | Premium Managed IT & Cybersecurity",
    description: "Secure, dependable IT support and cybersecurity consultancy for growing UK businesses.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CYVRIX Technologies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CYVRIX Technologies | Premium Managed IT & Cybersecurity",
    description: "Secure, dependable IT support and cybersecurity consultancy for growing UK businesses.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
      <body className="antialiased font-inter text-slate-900 bg-white min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
