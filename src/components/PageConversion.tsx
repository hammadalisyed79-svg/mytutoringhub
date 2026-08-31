"use client";

import { ConversionBeacon } from "@/components/ConversionBeacon";
import type { ConversionEventName, ConversionParams } from "@/lib/analytics-conversions";

/** Server pages pass a one-shot conversion (search, listing view, email verified, etc.). */
export function PageConversion({
  event,
  dedupeKey,
  params,
}: {
  event: ConversionEventName;
  dedupeKey: string;
  params?: ConversionParams;
}) {
  return <ConversionBeacon event={event} dedupeKey={dedupeKey} params={params} />;
}
