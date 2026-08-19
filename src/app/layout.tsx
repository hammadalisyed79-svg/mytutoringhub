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
    default: "MyTutoringHub – Find Expert Tutors Online Worldwide",
    template: "%s | MyTutoringHub",
  },
  description:
    "Connect with qualified tutors for GCSE, A-Level, IGCSE, IB and more. Find tutors in your country or online. Browse past papers free.",
  keywords: [
    "tutor",
    "online tutor",
    "GCSE tutor",
    "A-Level tutor",
    "IGCSE tutor",
    "IB tutor",
    "past papers",
    "online tutoring",
    "find a tutor",
    "private tutor",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "MyTutoringHub",
    title: "MyTutoringHub – Find Expert Tutors Online Worldwide",
    description:
      "Connect with qualified tutors for GCSE, A-Level, IGCSE, IB and more. Find tutors in your country or online.",
    url: "https://www.mytutoringhub.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MyTutoringHub – Find Expert Tutors Online Worldwide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MyTutoringHub – Find Expert Tutors Online Worldwide",
    description: "Connect with qualified tutors for GCSE, A-Level, IGCSE, IB and more.",
    images: ["/og-image.png"],
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
