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
import { encodeSubjectProfileNote } from "@/lib/listing-checkout";
import { trackProductEvent } from "@/lib/product-events";
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
    "EXTRA_PROFILE_ADS",
    "UNLIMITED_ADS",
  ]),
  billing: z.enum(["monthly", "annual"]).optional().default("monthly"),
  currency: z.string().optional(),
  country: z.string().optional(),
  useHubPoints: z.boolean().optional().default(false),
  /** Bind Boost / Highlight to one subject listing. */
  subjectProfileId: z.string().min(1).optional(),
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

  let subjectProfileNote: string | null = null;
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
    subjectProfileNote = encodeSubjectProfileNote(listing.id);
  } else if (plan === "AD_BOOST" || plan === "HIGHLIGHTED_AD") {
    return NextResponse.json(
      { error: "Choose which subject profile to boost or highlight" },
      { status: 400 },
    );
  }

  const appUrl = checkoutAppUrl(req);

  if (def.isComplimentary) {
    const granted = await grantComplimentaryPlan({ userId: session.user.id, plan: def });
    return NextResponse.json({
      granted: true,
      complimentary: true,
      alreadyActive: granted.alreadyActive,
      url: `${appUrl}/dashboard?checkout=success&plan=${plan}`,
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
  const basePricePkr =
    billing === "annual" && annualPricePkr != null ? annualPricePkr : def.chargePricePkr;

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
  const orderId = `${billing === "annual" ? "ann" : "mth"}_${plan}_${Date.now()}`;

  try {
    const listingQs = body.subjectProfileId
      ? `&listing=${encodeURIComponent(body.subjectProfileId)}`
      : "";
    const { url, tracker } = await createSafepayHostedCheckout({
      amount,
      currency,
      orderId,
      redirectUrl: `${appUrl}/api/safepay/complete?plan=${plan}&billing=${billing}${listingQs}`,
      cancelUrl: `${appUrl}/pricing?checkout=cancel&plan=${plan}`,
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
        billingPeriod: billing,
        pointsRedeemedPkr,
        ...(subjectProfileNote ? { notes: subjectProfileNote } : {}),
      },
      create: {
        userId: session.user.id,
        plan,
        status: "INCOMPLETE",
        stripeSubscriptionId: tracker,
        stripePriceId: `safepay_${currency}_${amount}`,
        billingPeriod: billing,
        pointsRedeemedPkr,
        notes: subjectProfileNote,
      },
    });

    trackProductEvent("checkout_started", {
      userId: session.user.id,
      plan,
      billing,
      currency,
      amount,
      subjectProfileId: body.subjectProfileId,
    });

    return NextResponse.json({
      url,
      tracker,
      provider: "safepay",
      currency,
      amount,
      billing,
      pointsRedeemedPkr,
      listPricePkr: basePricePkr,
    });
  } catch (err) {
    console.error("Safepay checkout error", err);
    return NextResponse.json({ error: safepayPublicError(err) }, { status: 502 });
  }
}
