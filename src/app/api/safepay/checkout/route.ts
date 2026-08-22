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
import { getPricingForCountry } from "@/lib/pricing";
import { z } from "zod";

export const runtime = "nodejs";

// Maps subscription plan IDs to their key in the per-country pricing table.
// Add-ons are one-time charges and do not have an annual variant.
const PLAN_PRICING_KEY: Record<string, keyof ReturnType<typeof getPricingForCountry> & string> = {
  STUDENT_PASS: "studentPlus",
  STUDENT_PRO: "studentPro",
  TUTOR_BASIC: "tutorPro",
  VERIFIED_TUTOR: "tutorElite",
};

const schema = z.object({
  plan: z.enum([
    "STUDENT_PASS",
    "STUDENT_PRO",
    "TUTOR_BASIC",
    "VERIFIED_TUTOR",
    "HIGHLIGHTED_AD",
    "AD_BOOST",
    "UNLIMITED_ADS",
  ]),
  billing: z.enum(["monthly", "annual"]).optional().default("monthly"),
  currency: z.string().optional(),
  country: z.string().optional(),
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

type PricingRow = { monthly: number; annual: number };

/** Returns the annual price in PKR for a plan if annual billing is requested, else undefined. */
function resolveAnnualPricePkr(
  plan: string,
  billing: "monthly" | "annual",
  country: string | null,
): number | undefined {
  if (billing !== "annual") return undefined;
  const pricingKey = PLAN_PRICING_KEY[plan];
  if (!pricingKey) return undefined;
  const entry = getPricingForCountry(country ?? "");
  const row = (entry as unknown as Record<string, PricingRow>)[pricingKey];
  if (!row) return undefined;
  // Annual prices in pricing.ts are already in local currency units, not PKR.
  // We need the PKR equivalent: use PK (PKR) pricing to get the PKR amount.
  const pkEntry = getPricingForCountry("PK");
  const pkRow = (pkEntry as unknown as Record<string, PricingRow>)[pricingKey];
  return pkRow?.annual;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const { plan, billing } = body;
  const def = await getLivePlan(plan);
  if (!def) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  if (session.user.role === "STUDENT" && def.audience !== "student") {
    return NextResponse.json({ error: "This plan is for tutors" }, { status: 400 });
  }
  if (session.user.role === "TUTOR" && def.audience !== "tutor") {
    return NextResponse.json({ error: "This plan is for students" }, { status: 400 });
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

  const detectedCountry = resolveCountry(req, body.country);
  // Sandbox Cybersource 3DS dummy cards are most reliable in PKR.
  // Production/live uses the visitor or preferred currency (never forced to PKR).
  const preferred = resolveCurrency(req, body.currency, body.country);
  const currency: CurrencyCode = getSafepayEnv() === "sandbox" ? "PKR" : preferred;

  // For annual billing, use the annual PKR price if available; otherwise fall back to monthly.
  const annualPricePkr = resolveAnnualPricePkr(plan, billing, detectedCountry);
  const basePricePkr = billing === "annual" && annualPricePkr != null
    ? annualPricePkr
    : def.chargePricePkr;

  const amountMajor = pkrToCurrency(basePricePkr, currency);
  const amount = toSafepayMinorUnits(amountMajor, currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid checkout amount" }, { status: 400 });
  }
  const orderId = `${billing === "annual" ? "ann" : "mth"}_${plan}_${Date.now()}`;

  try {
    const { url, tracker } = await createSafepayHostedCheckout({
      amount,
      currency,
      orderId,
      redirectUrl: `${appUrl}/api/safepay/complete?plan=${plan}&billing=${billing}`,
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
      },
      create: {
        userId: session.user.id,
        plan,
        status: "INCOMPLETE",
        stripeSubscriptionId: tracker,
        stripePriceId: `safepay_${currency}_${amount}`,
        billingPeriod: billing,
      },
    });

    return NextResponse.json({ url, tracker, provider: "safepay", currency, amount, billing });
  } catch (err) {
    console.error("Safepay checkout error", err);
    return NextResponse.json({ error: safepayPublicError(err) }, { status: 502 });
  }
}
