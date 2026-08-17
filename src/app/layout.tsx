import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Providers } from "@/components/Providers";
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
    "MyTutoringHub connects students and private tutors in Pakistan and worldwide. Subscribe to message, post requests, and arrange lessons — fees in PKR with USD estimate.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mytutoringhub.com"),
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
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
        </Providers>
      </body>
    </html>
  );
}
