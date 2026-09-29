import { GA_MEASUREMENT_ID, GOOGLE_ADS_ID } from "@/lib/analytics-conversions";

/**
 * Server-rendered Google tag in <head> so Ads/Tag Assistant can detect it
 * without waiting for client hydration (Next.js afterInteractive often fails retests).
 */
export function GoogleTagHead() {
  const primaryId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID;
  if (!primaryId) return null;

  const configLines = [
    GA_MEASUREMENT_ID
      ? `gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});`
      : "",
    GOOGLE_ADS_ID && GOOGLE_ADS_ID !== GA_MEASUREMENT_ID
      ? `gtag('config','${GOOGLE_ADS_ID}');`
      : !GA_MEASUREMENT_ID && GOOGLE_ADS_ID
        ? `gtag('config','${GOOGLE_ADS_ID}');`
        : "",
  ]
    .filter(Boolean)
    .join("");

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`} />
      <script
        id="mth-gtag"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${configLines}`,
        }}
      />
    </>
  );
}
