import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafepayClient, safepayConfigured } from "@/lib/safepay";
import { syncTutorBadges } from "@/lib/subscription";
import { sendEmail, paymentReceiptHtml } from "@/lib/email";
import { getPlan } from "@/lib/plans";
import { formatSafepayPriceId } from "@/lib/currency";
import type { SubscriptionPlan } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Safepay redirects here after hosted checkout with ?tracker=track_...
 * We verify payment status then activate the matching subscription for 30 days.
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const tracker = searchParams.get("tracker");
  const planHint = searchParams.get("plan") as SubscriptionPlan | null;

  if (!tracker) {
    return NextResponse.redirect(`${appUrl}/pricing?checkout=missing_tracker`);
  }

  if (!safepayConfigured()) {
    return NextResponse.redirect(`${appUrl}/pricing?checkout=safepay_unavailable`);
  }

  try {
    const safepay = getSafepayClient();
    const report = await safepay.reporter.payments.fetch(tracker);
    const state = report?.data?.tracker?.state as string | undefined;
    const paid = state === "TRACKER_ENDED";

    if (!paid) {
      return NextResponse.redirect(
        `${appUrl}/pricing?checkout=pending&tracker=${encodeURIComponent(tracker)}&state=${encodeURIComponent(state || "unknown")}`,
      );
    }

    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: tracker },
    });

    const plan = (existing?.plan || planHint) as SubscriptionPlan | undefined;
    if (!existing || !plan) {
      return NextResponse.redirect(`${appUrl}/pricing?checkout=unknown_order`);
    }

    const periodEnd = new Date(Date.now() + 30 * 86400000);
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: periodEnd,
      },
    });

    // Drop abandoned checkouts for the same plan so the dashboard stays clean.
    await prisma.subscription.updateMany({
      where: {
        userId: updated.userId,
        plan,
        status: "INCOMPLETE",
        id: { not: updated.id },
      },
      data: { status: "CANCELED" },
    });

    const user = await prisma.user.findUnique({ where: { id: updated.userId } });
    if (user?.role === "TUTOR") {
      await syncTutorBadges(user.id);
    }

    if (user?.email) {
      const planName = getPlan(plan)?.name || plan;
      const amountLabel = formatSafepayPriceId(updated.stripePriceId);
      try {
        await sendEmail({
          to: user.email,
          subject: `Receipt: ${planName} — MyTutoringHub`,
          html: paymentReceiptHtml({
            name: user.name,
            planName,
            amountLabel,
            periodEnd,
          }),
        });
      } catch (emailErr) {
        console.error("Payment receipt email failed", emailErr);
      }
    }

    return NextResponse.redirect(`${appUrl}/receipt/${updated.id}`);
  } catch (err) {
    console.error("Safepay complete error", err);
    return NextResponse.redirect(`${appUrl}/pricing?checkout=error`);
  }
}
