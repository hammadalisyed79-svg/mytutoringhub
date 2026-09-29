"use client";

import Script from "next/script";
import { GA_MEASUREMENT_ID, GOOGLE_ADS_ID } from "@/lib/analytics-conversions";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Loads gtag when GA4 and/or Google Ads IDs are set.
 * Ads conversion labels are applied in fireConversionEvent via send_to.
 */
export function GoogleAnalytics() {
  const primaryId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID;
  if (!primaryId) return null;

  const configLines = [
    GA_MEASUREMENT_ID
      ? `gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });`
      : "",
    GOOGLE_ADS_ID && GOOGLE_ADS_ID !== GA_MEASUREMENT_ID
      ? `gtag('config', '${GOOGLE_ADS_ID}');`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />
      <Script id="mth-gtag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${configLines}`}
      </Script>
    </>
  );
}
