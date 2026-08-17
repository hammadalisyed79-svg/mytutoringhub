import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
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
    default: "MyTutoringHub — Find private tutors",
    template: "%s · MyTutoringHub",
  },
  description:
    "MyTutoringHub connects students and private tutors worldwide. Subscribe to message, post requests, and arrange lessons — prices shown in your local currency.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mytutoringhub.com"),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Tutoring Hub",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logo-mark.png" }],
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
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
