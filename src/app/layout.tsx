import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { SiteAnnouncement } from "@/components/SiteAnnouncement";
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
    default: "My Tutoring Hub — Find private tutors",
    template: "%s · My Tutoring Hub",
  },
  description:
    "My Tutoring Hub connects students and private tutors worldwide. Subscribe to message, post requests, and arrange lessons — prices shown in your local currency.",
  keywords: [
    "private tutors",
    "find tutors",
    "online tutoring",
    "My Tutoring Hub",
    "Student Pass",
    "Tutor Basic",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "My Tutoring Hub",
    title: "My Tutoring Hub — Find private tutors",
    description:
      "Private tutors worldwide. Lesson fees stay off-platform. Student Pass and Tutor Basic subscriptions unlock messaging.",
    url: "https://www.mytutoringhub.com",
  },
  twitter: {
    card: "summary",
    title: "My Tutoring Hub",
    description: "Find private tutors worldwide. Message after you subscribe.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Tutoring Hub",
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
          <SiteAnnouncement />
          <main className="flex-1">
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
