/**
 * Lightweight product funnel events + durable search analytics for Marketplace V2.
 * Search volume / zero-results / demand dims / listing impressions persist to SearchAnalyticsEvent.
 */

import { prisma } from "@/lib/prisma";

export type ProductEventName =
  | "signup_complete"
  | "email_verified"
  | "tutor_contact_started"
  | "tutor_contact_limit_hit"
  | "enquiry_reveal"
  | "enquiry_reveal_limit_hit"
  | "match_survey_response"
  | "checkout_started"
  | "listing_viewed"
  | "search_results_shown"
  | "search_zero_results"
  | "become_tutor"
  | "switch_account_role"
  | "new_conversation"
  | "first_tutor_reply"
  | "first_student_reply"
  | "past_paper_download"
  | "paper_quota_exhausted";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Durable limit/quota/milestone rows for admin KPIs (reuses UsageEvent; no schema change). */
const DURABLE_USAGE_TYPES = new Set([
  "tutor_contact_limit_hit",
  "enquiry_reveal_limit_hit",
  "paper_quota_exhausted",
]);

async function persistDurableUsage(
  name: string,
  props: Record<string, string | number | boolean>,
) {
  const userId = typeof props.userId === "string" ? props.userId : null;
  if (!userId || !DURABLE_USAGE_TYPES.has(name)) return;
  try {
    await prisma.usageEvent.create({
      data: { userId, type: name, month: currentMonth() },
    });
  } catch (err) {
    console.error("[product-event] durable usage persist failed", name, err);
  }
}

function cleanProps(props?: Record<string, string | number | boolean | null | undefined>) {
  const clean: Record<string, string | number | boolean> = {};
  if (!props) return clean;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    clean[key] = value;
  }
  return clean;
}

async function persistSearchAnalytics(
  name: "search_results_shown" | "search_zero_results" | "listing_impressions",
  props: Record<string, string | number | boolean>,
) {
  try {
    const listingIds =
      typeof props.listingIds === "string"
        ? props.listingIds
        : typeof props.listingId === "string"
          ? props.listingId
          : null;
    await prisma.searchAnalyticsEvent.create({
      data: {
        type: name,
        subject: typeof props.subject === "string" ? props.subject : null,
        board: typeof props.board === "string" ? props.board : null,
        location: typeof props.location === "string" ? props.location : null,
        country: typeof props.country === "string" ? props.country : null,
        level: typeof props.level === "string" ? props.level : null,
        resultCount:
          typeof props.resultCount === "number"
            ? props.resultCount
            : typeof props.total === "number"
              ? props.total
              : null,
        listingIds,
      },
    });
  } catch (err) {
    console.error("[search-analytics] persist failed", name, err);
  }
}

export function trackProductEvent(
  name: ProductEventName,
  props?: Record<string, string | number | boolean | null | undefined>,
) {
  const clean = cleanProps(props);
  if (process.env.NODE_ENV !== "production") {
    console.info("[product-event]", name, clean);
  }
  if (name === "search_results_shown" || name === "search_zero_results") {
    void persistSearchAnalytics(name, clean);
  }
  if (
    name === "tutor_contact_limit_hit" ||
    name === "enquiry_reveal_limit_hit" ||
    name === "paper_quota_exhausted"
  ) {
    void persistDurableUsage(name, clean);
  }
}

/** Record listing impressions from a search result set (ids only — not surveillance-heavy). */
export async function recordSearchListingImpressions(opts: {
  subject?: string | null;
  board?: string | null;
  location?: string | null;
  country?: string | null;
  level?: string | null;
  listingIds: string[];
  resultCount: number;
}) {
  if (opts.listingIds.length === 0) return;
  await persistSearchAnalytics("listing_impressions", {
    subject: opts.subject || "",
    board: opts.board || "",
    location: opts.location || "",
    country: opts.country || "",
    level: opts.level || "",
    resultCount: opts.resultCount,
    listingIds: opts.listingIds.slice(0, 50).join(","),
  });
}
