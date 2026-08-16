import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { planFromPriceId, getPlan } from "@/lib/plans";
import { syncTutorBadges } from "@/lib/subscription";
import { sendEmail, subscriptionEmailHtml } from "@/lib/email";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types";

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId;
  const priceId = sub.items.data[0]?.price.id;
  const plan =
    (sub.metadata.plan as SubscriptionPlan | undefined) ||
    (priceId ? planFromPriceId(priceId) : null);
  if (!userId || !plan) return;

  const rawEnd =
    (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end ||
    sub.cancel_at ||
    null;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: {
      status: mapStatus(sub.status),
      stripePriceId: priceId,
      currentPeriodEnd: rawEnd ? new Date(rawEnd * 1000) : null,
      plan,
    },
    create: {
      userId,
      plan,
      status: mapStatus(sub.status),
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      currentPeriodEnd: rawEnd ? new Date(rawEnd * 1000) : null,
    },
  });

  await syncTutorBadges(userId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const planDef = getPlan(plan);
  if (user && planDef) {
    await sendEmail({
      to: user.email,
      subject: `MyTutoringHub — ${planDef.name}`,
      html: subscriptionEmailHtml(
        planDef.name,
        ["ACTIVE", "TRIALING"].includes(mapStatus(sub.status)),
      ),
    });
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || secret.includes("replace")) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          if (session.metadata?.userId) sub.metadata.userId = session.metadata.userId;
          if (session.metadata?.plan) sub.metadata.plan = session.metadata.plan;
          await upsertFromSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("Webhook handler error", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
