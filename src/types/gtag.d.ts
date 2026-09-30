/** Shared window.gtag typing for GA4 / Google Ads (GoogleTagHead loads the script). */
export {};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
