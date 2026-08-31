"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics-conversions";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Loads gtag when NEXT_PUBLIC_GA_MEASUREMENT_ID is set. Keeps Vercel Analytics separate. */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="mth-ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });`}
      </Script>
    </>
  );
}
