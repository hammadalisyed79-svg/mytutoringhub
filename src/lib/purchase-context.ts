/**
 * Zero-friction purchase context: return paths, triggers, checkout notes.
 * No PII — paths and product triggers only.
 */
import { safeReturnPath } from "@/lib/safe-return-url";
import type { SubscriptionPlan } from "@/lib/types";

export type PurchaseTrigger =
  | "contact_limit"
  | "past_paper_limit"
  | "past_paper_buy"
  | "ai_feature"
  | "request_ad"
  | "reveal_limit"
  | "teaching_profile_limit"
  | "listing_boost"
  | "verification"
  | "pricing"
  | "messages"
  | "manual";

export type PurchaseCheckoutNotes = {
  subjectProfileId?: string;
  returnUrl?: string;
  trigger?: PurchaseTrigger;
};

export function encodePurchaseNotes(opts: PurchaseCheckoutNotes): string | null {
  const payload: PurchaseCheckoutNotes = {};
  if (opts.subjectProfileId?.trim()) payload.subjectProfileId = opts.subjectProfileId.trim();
  if (opts.returnUrl) {
    const safe = safeReturnPath(opts.returnUrl, "");
    if (safe) payload.returnUrl = safe;
  }
  if (opts.trigger) payload.trigger = opts.trigger;
  if (!payload.subjectProfileId && !payload.returnUrl && !payload.trigger) return null;
  return JSON.stringify(payload);
}

export function parsePurchaseNotes(notes?: string | null): PurchaseCheckoutNotes {
  if (!notes?.trim()) return {};
  const trimmed = notes.trim();
  try {
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as PurchaseCheckoutNotes;
      return {
        subjectProfileId:
          typeof parsed.subjectProfileId === "string" ? parsed.subjectProfileId.trim() : undefined,
        returnUrl:
          typeof parsed.returnUrl === "string"
            ? safeReturnPath(parsed.returnUrl, "") || undefined
            : undefined,
        trigger: parsed.trigger,
      };
    }
  } catch {
    // fall through
  }
  const idMatch = trimmed.match(/(?:^|\s|;|,)subjectProfileId=([a-zA-Z0-9_-]+)/);
  if (idMatch?.[1]) return { subjectProfileId: idMatch[1] };
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return { subjectProfileId: trimmed };
  return {};
}

/** Primary post-purchase CTA for the original journey. */
export function purchaseContinueCta(opts: {
  plan: string;
  returnUrl?: string | null;
  subjectProfileId?: string | null;
}): { href: string; label: string } {
  const returnUrl = opts.returnUrl ? safeReturnPath(opts.returnUrl, "") : "";
  if (returnUrl) {
    return { href: returnUrl, label: continueLabelForPath(returnUrl, opts.plan) };
  }
  switch (opts.plan as SubscriptionPlan) {
    case "STUDENT_PASS":
      return { href: "/search", label: "Find tutors" };
    case "STUDENT_PRO":
      return { href: "/assistant", label: "Open study assistant" };
    case "TUTOR_BASIC":
      return {
        href: "/dashboard/tutor?tab=profile#teaching-listings",
        label: "Continue to Teaching Profiles",
      };
    case "AD_BOOST":
      return {
        href: opts.subjectProfileId
          ? `/dashboard/tutor?tab=profile&listing=${encodeURIComponent(opts.subjectProfileId)}#teaching-listings`
          : "/dashboard/tutor?tab=profile#teaching-listings",
        label: "View Teaching Profile",
      };
    case "VERIFIED_TUTOR":
      return {
        href: "/dashboard/tutor?tab=profile&verify=1",
        label: "Continue to verification",
      };
    default:
      return { href: "/dashboard", label: "Back to dashboard" };
  }
}

function continueLabelForPath(path: string, plan: string): string {
  if (path.startsWith("/messages") || path.includes("contact")) return "Continue to tutor";
  if (path.startsWith("/listings/") || path.startsWith("/tutors/")) return "Continue to tutor";
  if (path.startsWith("/past-papers")) return "Download paper";
  if (path.startsWith("/ads/new") || path.startsWith("/ads")) return "Post your request";
  if (path.startsWith("/assistant")) return "Open study assistant";
  if (path.includes("verify")) return "Continue to verification";
  if (path.includes("teaching-listings") || path.includes("listing=")) {
    return "View Teaching Profile";
  }
  if (path.startsWith("/search")) return "Continue searching";
  if (plan === "TUTOR_BASIC") return "Continue to enquiry";
  return "Continue";
}

/** Plans that should not start a second overlapping paid period. Boost may extend. */
export const NON_STACKABLE_CHECKOUT_PLANS: SubscriptionPlan[] = [
  "STUDENT_PASS",
  "STUDENT_PRO",
  "TUTOR_BASIC",
  "VERIFIED_TUTOR",
];
