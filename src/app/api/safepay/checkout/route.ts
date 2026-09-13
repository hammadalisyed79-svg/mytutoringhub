import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLivePlan } from "@/lib/plans";
import { grantComplimentaryPlan } from "@/lib/plan-checkout";
import {
  checkoutCurrency,
  currencyFromAcceptLanguage,
  currencyFromCountry,
  pkrToCurrency,
  toSafepayMinorUnits,
  type CurrencyCode,
} from "@/lib/currency";
import {
  checkoutAppUrl,
  createSafepayHostedCheckout,
  getSafepayEnv,
  safepayConfigured,
  safepayPublicError,
} from "@/lib/safepay";
import { reconcileUserSafepayPayments } from "@/lib/safepay-complete";
import { computeMaxRedeemablePoints, getHubPointsBalanceSafe } from "@/lib/hub-points";
import { encodeCheckoutNotes } from "@/lib/listing-checkout";
import { trackProductEvent } from "@/lib/product-events";
import {
  NON_STACKABLE_CHECKOUT_PLANS,
  type PurchaseTrigger,
} from "@/lib/purchase-context";
import { safeReturnPath } from "@/lib/safe-return-url";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum([
    "STUDENT_PASS",
    "STUDENT_PRO",
    "TUTOR_BASIC",
    "VERIFIED_TUTOR",
    "HIGHLIGHTED_AD",
    "AD_BOOST",
    "EXTRA_ACTIVE",
    "EXTRA_PROFILE_ADS",
    "UNLIMITED_ADS",
  ]),
  billing: z.enum(["monthly", "annual"]).optional().default("monthly"),
  currency: z.string().optional(),
  country: z.string().optional(),
  useHubPoints: z.boolean().optional().default(false),
  /** Bind Boost / Highlight to one subject listing. */
  subjectProfileId: z.string().min(1).optional(),
  /** Resume this same-origin path after successful payment. */
  returnUrl: z.string().max(500).optional(),
  trigger: z
    .enum([
      "contact_limit",
      "past_paper_limit",
      "past_paper_buy",
      "ai_feature",
      "request_ad",
      "reveal_limit",
      "teaching_profile_limit",
      "listing_boost",
      "verification",
      "pricing",
      "messages",
      "manual",
    ])
    .optional(),
});

function resolveCountry(req: Request, bodyCountry?: string): string | null {
  if (bodyCountry && bodyCountry.length === 2) return bodyCountry.toUpperCase();
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code") ||
    null
  );
}

function resolveCurrency(req: Request, bodyCurrency?: string, bodyCountry?: string): CurrencyCode {
  if (bodyCurrency && bodyCurrency.length === 3) {
    return checkoutCurrency(bodyCurrency.toUpperCase() as CurrencyCode);
  }
  const country = resolveCountry(req, bodyCountry);
  if (country && country !== "XX" && country !== "T1") {
    return checkoutCurrency(currencyFromCountry(country));
  }
  return checkoutCurrency(currencyFromAcceptLanguage(req.headers.get("accept-language")));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const { plan, billing, useHubPoints } = body;
  const def = await getLivePlan(plan);
  if (!def) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  if (session.user.role === "STUDENT" && def.audience !== "student") {
    return NextResponse.json({ error: "This plan is for tutors" }, { status: 400 });
  }
  if (session.user.role === "TUTOR" && def.audience !== "tutor") {
    return NextResponse.json({ error: "This plan is for students" }, { status: 400 });
  }

  if ((NON_STACKABLE_CHECKOUT_PLANS as string[]).includes(plan)) {
    const { hasActivePlan, hasAnyActivePlan } = await import("@/lib/subscription");
    if (plan === "STUDENT_PASS") {
      if (await hasActivePlan(session.user.id, "STUDENT_PRO")) {
        return NextResponse.json(
          {
            error: "You already have Student Pro, which includes Pass benefits.",
            manageUrl: "/dashboard",
          },
          { status: 409 },
        );
      }
      if (await hasActivePlan(session.user.id, "STUDENT_PASS")) {
        return NextResponse.json(
          {
            error: "Student Pass is already active on your account.",
            manageUrl: "/dashboard",
          },
          { status: 409 },
        );
      }
    } else if (plan === "STUDENT_PRO") {
      if (await hasActivePlan(session.user.id, "STUDENT_PRO")) {
        return NextResponse.json(
          {
            error: "Student Pro is already active on your account.",
            manageUrl: "/dashboard",
          },
          { status: 409 },
        );
      }
    } else if (plan === "TUTOR_BASIC") {
      if (
        await hasAnyActivePlan(session.user.id, [
          "TUTOR_BASIC",
          "EXTRA_PROFILE_ADS",
          "UNLIMITED_ADS",
        ])
      ) {
        return NextResponse.json(
          {
            error: "Tutor Pro (or an equivalent plan) is already active.",
            manageUrl: "/dashboard/tutor",
          },
          { status: 409 },
        );
      }
    } else if (plan === "VERIFIED_TUTOR") {
      if (await hasActivePlan(session.user.id, "VERIFIED_TUTOR")) {
        return NextResponse.json(
          {
            error: "Priority Verification Review is already active for your account.",
            manageUrl: "/dashboard/tutor?tab=profile&verify=1",
          },
          { status: 409 },
        );
      }
    }
  }

  if (plan === "EXTRA_ACTIVE") {
    const { countExtraActiveSlots, EXTRA_ACTIVE_SLOT_MAX } = await import(
      "@/lib/subject-profile-entitlements"
    );
    const { hasPaidTutorPlan } = await import("@/lib/subscription");
    if (await hasPaidTutorPlan(session.user.id)) {
      return NextResponse.json(
        {
          error:
            "Tutor Pro already includes up to 10 active Teaching Profiles. Extra Active is only for Free tutors.",
        },
        { status: 400 },
      );
    }
    const slots = await countExtraActiveSlots(session.user.id);
    if (slots >= EXTRA_ACTIVE_SLOT_MAX) {
      return NextResponse.json(
        {
          error: `You already have ${EXTRA_ACTIVE_SLOT_MAX} Extra Active slots (3 live profiles max). Upgrade to Tutor Pro for up to 10.`,
        },
        { status: 400 },
      );
    }
  }

  let checkoutNotes: string | null = null;
  let listingIdForRedirect: string | undefined;
  if (body.subjectProfileId) {
    if (plan !== "AD_BOOST" && plan !== "HIGHLIGHTED_AD") {
      return NextResponse.json(
        { error: "subjectProfileId is only valid for Boost or Highlight" },
        { status: 400 },
      );
    }
    const listing = await prisma.subjectProfile.findFirst({
      where: {
        id: body.subjectProfileId,
        tutorProfile: { userId: session.user.id },
      },
      select: { id: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Subject profile not found" }, { status: 404 });
    }
    listingIdForRedirect = listing.id;
  } else if (plan === "AD_BOOST" || plan === "HIGHLIGHTED_AD") {
    return NextResponse.json(
      { error: "Choose which subject profile to boost or highlight" },
      { status: 400 },
    );
  }

  const safeReturn = body.returnUrl ? safeReturnPath(body.returnUrl, "") : "";
  const defaultBoostReturn = listingIdForRedirect
    ? `/dashboard/tutor?tab=profile&listing=${encodeURIComponent(listingIdForRedirect)}#teaching-listings`
    : "";
  checkoutNotes = encodeCheckoutNotes({
    subjectProfileId: listingIdForRedirect,
    returnUrl: safeReturn || defaultBoostReturn || undefined,
    trigger: body.trigger as PurchaseTrigger | undefined,
  });

  const appUrl = checkoutAppUrl(req);

  if (def.isComplimentary) {
    const granted = await grantComplimentaryPlan({ userId: session.user.id, plan: def });
    const destPath =
      safeReturn ||
      (session.user.role === "TUTOR"
        ? "/dashboard/tutor?tab=profile#teaching-listings"
        : "/dashboard");
    return NextResponse.json({
      granted: true,
      complimentary: true,
      alreadyActive: granted.alreadyActive,
      url: `${appUrl}${destPath}${destPath.includes("?") ? "&" : "?"}checkout=success&plan=${plan}`,
    });
  }

  if (!safepayConfigured()) {
    return NextResponse.json(
      { error: "Safepay is not configured. Add SAFEPAY_API_KEY and SAFEPAY_SECRET_KEY." },
      { status: 503 },
    );
  }

  // Sandbox Cybersource 3DS dummy cards are most reliable in PKR.
  // Production/live uses the visitor or preferred currency (never forced to PKR).
  const preferred = resolveCurrency(req, body.currency, body.country);
  const currency: CurrencyCode = getSafepayEnv() === "sandbox" ? "PKR" : preferred;

  // Annual amounts come from plans.ts (canonical PKR); geo conversion via currency helpers.
  const annualPricePkr = def.annualChargePricePkr;
  const canAnnualBoost =
    plan === "AD_BOOST" && billing === "annual" && annualPricePkr != null;
  const recurringAddOn = plan === "EXTRA_ACTIVE";
  const canAnnualExtra = recurringAddOn && billing === "annual" && annualPricePkr != null;
  const basePricePkr = canAnnualBoost || canAnnualExtra
    ? annualPricePkr!
    : billing === "annual" && !def.isAddOn && annualPricePkr != null
      ? annualPricePkr
      : def.chargePricePkr;

  const hubPointsBalance = await getHubPointsBalanceSafe(session.user.id);
  const pointsRedeemedPkr = useHubPoints
    ? computeMaxRedeemablePoints(hubPointsBalance, basePricePkr)
    : 0;
  const chargePricePkr = Math.max(0, basePricePkr - pointsRedeemedPkr);

  const amountMajor = pkrToCurrency(chargePricePkr, currency);
  const amount = toSafepayMinorUnits(amountMajor, currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid checkout amount" }, { status: 400 });
  }
  // Core add-ons are one-shot; EXTRA_ACTIVE is monthly/annual; annual Listing Boost = 365-day window.
  const billingPeriod = canAnnualBoost
    ? "annual"
    : recurringAddOn
      ? billing === "annual"
        ? "annual"
        : "monthly"
      : def.isAddOn
        ? "once"
        : billing;
  const orderId = `${
    canAnnualBoost || canAnnualExtra
      ? "ann"
      : recurringAddOn
        ? billing === "annual"
          ? "ann"
          : "mth"
        : def.isAddOn
          ? "once"
          : billing === "annual"
            ? "ann"
            : "mth"
  }_${plan}_${Date.now()}`;

  try {
    const listingQs = body.subjectProfileId
      ? `&listing=${encodeURIComponent(body.subjectProfileId)}`
      : "";
    const returnQs = safeReturn ? `&returnUrl=${encodeURIComponent(safeReturn)}` : "";
    const cancelPath = safeReturn || defaultBoostReturn || "/pricing";
    const cancelUrl = cancelPath.startsWith("/pricing")
      ? `${appUrl}/pricing?checkout=cancel&plan=${plan}`
      : `${appUrl}${cancelPath}${cancelPath.includes("?") ? "&" : "?"}checkout=cancel&plan=${plan}`;
    const { url, tracker } = await createSafepayHostedCheckout({
      amount,
      currency,
      orderId,
      redirectUrl: `${appUrl}/api/safepay/complete?plan=${plan}&billing=${billing}${listingQs}${returnQs}`,
      cancelUrl,
    });

    await reconcileUserSafepayPayments(session.user.id);

    await prisma.subscription.updateMany({
      where: {
        userId: session.user.id,
        plan,
        status: "INCOMPLETE",
      },
      data: { status: "CANCELED" },
    });

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: tracker },
      update: {
        userId: session.user.id,
        plan,
        status: "INCOMPLETE",
        stripePriceId: `safepay_${currency}_${amount}`,
        billingPeriod,
        pointsRedeemedPkr,
        ...(checkoutNotes ? { notes: checkoutNotes } : {}),
      },
      create: {
        userId: session.user.id,
        plan,
        status: "INCOMPLETE",
        stripeSubscriptionId: tracker,
        stripePriceId: `safepay_${currency}_${amount}`,
        billingPeriod,
        pointsRedeemedPkr,
        notes: checkoutNotes,
      },
    });

    trackProductEvent("checkout_started", {
      userId: session.user.id,
      plan,
      billing,
      currency,
      amount,
      subjectProfileId: body.subjectProfileId,
      trigger: body.trigger,
    });

    return NextResponse.json({
      url,
      tracker,
      provider: "safepay",
      currency,
      amount,
      billing,
      plan,
      pointsRedeemedPkr,
      listPricePkr: basePricePkr,
    });
  } catch (err) {
    console.error("Safepay checkout error", err);
    return NextResponse.json({ error: safepayPublicError(err) }, { status: 502 });
  }
}
