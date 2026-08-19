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
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum([
    "STUDENT_PASS",
    "TUTOR_BASIC",
    "VERIFIED_TUTOR",
    "HIGHLIGHTED_AD",
    "AD_BOOST",
    "UNLIMITED_ADS",
  ]),
  currency: z.string().optional(),
});

function resolveCurrency(req: Request, bodyCurrency?: string): CurrencyCode {
  if (bodyCurrency && bodyCurrency.length === 3) {
    return checkoutCurrency(bodyCurrency.toUpperCase() as CurrencyCode);
  }
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code");
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
  const { plan } = body;
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

  // Sandbox Cybersource 3DS dummy cards are most reliable in PKR.
  // Production/live uses the visitor or preferred currency (never forced to PKR).
  const preferred = resolveCurrency(req, body.currency);
  const currency: CurrencyCode = getSafepayEnv() === "sandbox" ? "PKR" : preferred;
  const amountMajor = pkrToCurrency(def.chargePricePkr, currency);
  const amount = toSafepayMinorUnits(amountMajor, currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid checkout amount" }, { status: 400 });
  }
  const orderId = `mth_${plan}_${Date.now()}`;

  try {
    const { url, tracker } = await createSafepayHostedCheckout({
      amount,
      currency,
      orderId,
      redirectUrl: `${appUrl}/api/safepay/complete?plan=${plan}`,
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
      },
      create: {
        userId: session.user.id,
        plan,
        status: "INCOMPLETE",
        stripeSubscriptionId: tracker,
        stripePriceId: `safepay_${currency}_${amount}`,
      },
    });

    return NextResponse.json({ url, tracker, provider: "safepay", currency, amount });
  } catch (err) {
    console.error("Safepay checkout error", err);
    return NextResponse.json({ error: safepayPublicError(err) }, { status: 502 });
  }
}
