import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import {
  checkoutCurrency,
  currencyFromAcceptLanguage,
  currencyFromCountry,
  pkrToCurrency,
  toSafepayMinorUnits,
  type CurrencyCode,
} from "@/lib/currency";
import { getSafepayClient, getSafepayEnv, safepayConfigured } from "@/lib/safepay";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum(["STUDENT_PASS", "TUTOR_BASIC", "VERIFIED_TUTOR", "HIGHLIGHTED_AD"]),
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

  if (!safepayConfigured()) {
    return NextResponse.json(
      { error: "Safepay is not configured. Add SAFEPAY_API_KEY and SAFEPAY_SECRET_KEY." },
      { status: 503 },
    );
  }

  const body = schema.parse(await req.json());
  const { plan } = body;
  const def = PLANS.find((p) => p.id === plan);
  if (!def) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  if (session.user.role === "STUDENT" && def.audience !== "student") {
    return NextResponse.json({ error: "This plan is for tutors" }, { status: 400 });
  }
  if (session.user.role === "TUTOR" && def.audience !== "tutor") {
    return NextResponse.json({ error: "This plan is for students" }, { status: 400 });
  }

  const currency = resolveCurrency(req, body.currency);
  const amountMajor = pkrToCurrency(def.pricePkr, currency);
  const amount = toSafepayMinorUnits(amountMajor, currency);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const apiKey = process.env.SAFEPAY_API_KEY!;
  const safepay = getSafepayClient();
  const env = getSafepayEnv();
  const orderId = `mth_${session.user.id}_${plan}_${Date.now()}`;

  try {
    const paymentSession = await safepay.payments.session.setup({
      merchant_api_key: apiKey,
      intent: process.env.SAFEPAY_INTENT || "CYBERSOURCE",
      mode: "payment",
      entry_mode: "raw",
      currency,
      amount,
      metadata: {
        order_id: orderId,
      },
      include_fees: false,
    });

    const tracker = paymentSession?.data?.tracker?.token as string | undefined;
    if (!tracker) {
      console.error("Safepay session response missing tracker", paymentSession);
      return NextResponse.json({ error: "Could not create Safepay session" }, { status: 502 });
    }

    const passport = await safepay.client.passport.create();
    const tbt = (typeof passport?.data === "string" ? passport.data : passport?.data?.token) as
      | string
      | undefined;
    if (!tbt) {
      console.error("Safepay passport response missing token", passport);
      return NextResponse.json({ error: "Could not create Safepay auth token" }, { status: 502 });
    }

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

    const url = safepay.checkout.createCheckoutUrl({
      env,
      tracker,
      tbt,
      source: "hosted",
      order_id: orderId,
      redirect_url: `${appUrl}/api/safepay/complete?plan=${plan}`,
      cancel_url: `${appUrl}/pricing?checkout=cancel`,
    });

    return NextResponse.json({ url, tracker, provider: "safepay", currency, amount });
  } catch (err) {
    console.error("Safepay checkout error", err);
    const message = err instanceof Error ? err.message : "Safepay checkout failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
