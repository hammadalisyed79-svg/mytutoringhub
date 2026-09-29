"use client";

import { useEffect } from "react";
import {
  type ConversionEventName,
  type ConversionParams,
  googleAdsSendTo,
  sanitizeConversionParams,
} from "@/lib/analytics-conversions";

const STORAGE_PREFIX = "mth_ga_once_";

function alreadyFired(dedupeKey: string) {
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + dedupeKey) === "1";
  } catch {
    return false;
  }
}

function markFired(dedupeKey: string) {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + dedupeKey, "1");
  } catch {
    /* ignore */
  }
}

export function fireConversionEvent(
  event: ConversionEventName,
  params?: ConversionParams,
  dedupeKey?: string,
) {
  if (typeof window === "undefined") return false;
  const key = dedupeKey || "";
  if (key && alreadyFired(key)) return false;
  const clean = sanitizeConversionParams(params);
  if (typeof window.gtag === "function") {
    window.gtag("event", event, clean);
    const sendTo = googleAdsSendTo(event);
    if (sendTo) {
      const adsPayload: Record<string, string | number | boolean> = {
        ...clean,
        send_to: sendTo,
      };
      if (typeof clean.value === "number") {
        adsPayload.value = clean.value;
      }
      if (typeof clean.currency === "string") {
        adsPayload.currency = clean.currency;
      }
      if (typeof clean.transaction_id === "string") {
        adsPayload.transaction_id = clean.transaction_id;
      }
      window.gtag("event", "conversion", adsPayload);
    }
  }
  if (process.env.NODE_ENV !== "production") {
    console.info("[ga4-conversion]", event, clean, googleAdsSendTo(event) || undefined);
  }
  if (key) markFired(key);
  return true;
}

/** Fire a conversion once per dedupeKey (receipt revisit / refresh safe). */
export function ConversionBeacon({
  event,
  params,
  dedupeKey,
}: {
  event: ConversionEventName;
  params?: ConversionParams;
  dedupeKey: string;
}) {
  useEffect(() => {
    fireConversionEvent(event, params, dedupeKey);
    // Intentionally once per mount/dedupeKey — params snapshotted at first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, dedupeKey]);
  return null;
}
