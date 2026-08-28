import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getPriceId, PLANS } from "@/lib/plans";
import { syncTutorBadges } from "@/lib/subscription";
import { safepayConfigured } from "@/lib/safepay";
import type { SubscriptionPlan } from "@/lib/types";
import { encodeSubjectProfileNote } from "@/lib/listing-checkout";
import { applyVisibilityToSubjectProfile } from "@/lib/listing-boost";
import { z } from "zod";

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
  subjectProfileId: z.string().min(1).optional(),
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

  const { plan, subjectProfileId: rawListingId } = schema.parse(await req.json());
  const def = PLANS.find((p) => p.id === plan);
  if (!def) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  if (session.user.role === "STUDENT" && def.audience !== "student") {
    return NextResponse.json({ error: "This plan is for tutors" }, { status: 400 });
  }
  if (session.user.role === "TUTOR" && def.audience !== "tutor") {
    return NextResponse.json({ error: "This plan is for students" }, { status: 400 });
  }

  let subjectProfileId: string | undefined;
  let subjectProfileNote: string | null = null;
  if (rawListingId) {
    if (plan !== "AD_BOOST" && plan !== "HIGHLIGHTED_AD") {
      return NextResponse.json(
        { error: "subjectProfileId is only valid for Boost or Highlight" },
        { status: 400 },
      );
    }
    const listing = await prisma.subjectProfile.findFirst({
      where: { id: rawListingId, tutorProfile: { userId: session.user.id } },
      select: { id: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Subject profile not found" }, { status: 404 });
    }
    subjectProfileId = listing.id;
    subjectProfileNote = encodeSubjectProfileNote(listing.id);
  } else if (plan === "AD_BOOST" || plan === "HIGHLIGHTED_AD") {
    return NextResponse.json(
      { error: "Choose which subject profile to boost or highlight" },
      { status: 400 },
    );
  }

  const priceId = getPriceId(plan as SubscriptionPlan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!stripeConfigured() || !priceLooksReal(priceId)) {
    const until = new Date(Date.now() + 30 * 86400000);
    await prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: `dev_${session.user.id}_${plan}_${subjectProfileId || "account"}`,
      },
      update: {
        status: "ACTIVE",
        currentPeriodEnd: until,
        ...(subjectProfileNote ? { notes: subjectProfileNote } : {}),
      },
      create: {
        userId: session.user.id,
        plan,
        status: "ACTIVE",
        stripeSubscriptionId: `dev_${session.user.id}_${plan}_${subjectProfileId || "account"}`,
        currentPeriodEnd: until,
        notes: subjectProfileNote,
      },
    });
    if (session.user.role === "TUTOR") {
      await syncTutorBadges(session.user.id);
      if (subjectProfileId && (plan === "AD_BOOST" || plan === "HIGHLIGHTED_AD")) {
        await applyVisibilityToSubjectProfile({
          userId: session.user.id,
          subjectProfileId,
          plan,
          until,
        });
      }
    }
    return NextResponse.json({ url: `${appUrl}/dashboard/tutor?checkout=success&plan=${plan}` });
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
    metadata: {
      userId: user.id,
      plan,
      ...(subjectProfileId ? { subjectProfileId } : {}),
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
        ...(subjectProfileId ? { subjectProfileId } : {}),
      },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
