import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPriceId, PLANS } from "@/lib/plans";
import { syncTutorBadges } from "@/lib/subscription";
import { safepayConfigured } from "@/lib/safepay";
import type { SubscriptionPlan } from "@/lib/types";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["STUDENT_PASS", "TUTOR_BASIC", "VERIFIED_TUTOR", "HIGHLIGHTED_AD"]),
});

function stripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  return Boolean(key) && !key.includes("replace") && !key.includes("placeholder");
}

function priceLooksReal(priceId: string | undefined) {
  return Boolean(
    priceId && priceId.startsWith("price_") && priceId.length > 12 && !priceId.includes("replace"),
  );
}

export async function POST(req: Request) {
  // Prefer Safepay when configured — clients should hit /api/safepay/checkout first.
  if (safepayConfigured()) {
    return NextResponse.json(
      { error: "Use Safepay checkout", code: "USE_SAFEPAY" },
      { status: 409 },
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = schema.parse(await req.json());
  const def = PLANS.find((p) => p.id === plan);
  if (!def) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  if (session.user.role === "STUDENT" && def.audience !== "student") {
    return NextResponse.json({ error: "This plan is for tutors" }, { status: 400 });
  }
  if (session.user.role === "TUTOR" && def.audience !== "tutor") {
    return NextResponse.json({ error: "This plan is for students" }, { status: 400 });
  }

  const priceId = getPriceId(plan as SubscriptionPlan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!stripeConfigured() || !priceLooksReal(priceId)) {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: `dev_${session.user.id}_${plan}` },
      update: {
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
      create: {
        userId: session.user.id,
        plan,
        status: "ACTIVE",
        stripeSubscriptionId: `dev_${session.user.id}_${plan}`,
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });
    if (session.user.role === "TUTOR") {
      await syncTutorBadges(session.user.id);
    }
    return NextResponse.json({ url: `${appUrl}/dashboard?subscribed=1` });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId!, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancel`,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
  });

  return NextResponse.json({ url: checkout.url });
}
