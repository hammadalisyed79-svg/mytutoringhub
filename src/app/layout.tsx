import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/SiteHeader";
import { TrustRibbon } from "@/components/TrustRibbon";
import { SiteFooter } from "@/components/SiteFooter";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { SiteAnnouncement } from "@/components/SiteAnnouncement";
import { DEFAULT_SITE_URL, SITE_NAME, SITE_NAME_COMPACT, siteUrl } from "@/lib/seo";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} – Find Expert Tutors Online Worldwide`,
    template: `%s | ${SITE_NAME_COMPACT}`,
  },
  description:
    "Find tutors free. Pay only for messaging access and study tools — lesson fees stay between you and the tutor. GCSE, A-Level, IGCSE, IB and more.",
  keywords: [
    "private tutor",
    "online tutor",
    "find a tutor",
    "GCSE tutor",
    "A-Level tutor",
    "IGCSE tutor",
    "IB tutor",
    "Matric tutor",
    "past papers",
    "online tutoring",
    "tutoring marketplace",
  ],
  metadataBase: new URL(siteUrl()),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: SITE_NAME_COMPACT,
    title: `${SITE_NAME} – Private tutoring, elevated.`,
    description:
      "Search free · No lesson commission · Student Pass unlocks unlimited contacts. Find tutors worldwide.",
    url: DEFAULT_SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – Private tutoring, elevated.`,
    description:
      "Search free · No lesson commission · Student Pass unlocks unlimited contacts.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg" }],
    shortcut: ["/logo.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08463c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          <SiteHeader />
          <TrustRibbon />
          <SiteAnnouncement />
          <main className="flex-1 site-main">
            <MaintenanceGate>{children}</MaintenanceGate>
          </main>
          <SiteFooter />
          <ServiceWorkerRegister />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
