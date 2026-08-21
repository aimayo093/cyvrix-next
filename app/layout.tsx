import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { getFaviconMetadata } from "@/lib/public-cache";

// Self-hosted at build time. The previous Google Fonts @import in globals.css was
// blocked by the site's own Content-Security-Policy, so neither face ever loaded.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit-display",
});

export const viewport: Viewport = {
  themeColor: "#041635",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const faviconAsset = await getFaviconMetadata().catch((error) => {
    console.error("[metadata] failed to load favicon asset", error);
    return null;
  });
  
  const faviconUrl = faviconAsset?.mediaUrl || "/favicon.ico";

  return {
    title: {
      default: "CYVRIX Technologies | Premium Managed IT & Cybersecurity",
      template: "%s | CYVRIX Technologies",
    },
    description: "Secure, dependable IT support and cybersecurity consultancy for growing UK businesses. Managed IT, cloud infrastructure, and digital transformation.",
    metadataBase: new URL("https://cyvrix.co.uk"),
    keywords: ["Managed IT UK", "Cybersecurity Consultancy", "IT Support London", "Cloud Infrastructure", "CYVRIX"],
    authors: [{ name: "CYVRIX Technologies" }],
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: "https://cyvrix.co.uk",
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`scroll-smooth ${inter.variable} ${outfit.variable}`}>
      <body suppressHydrationWarning className="antialiased font-inter text-slate-900 bg-white min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
