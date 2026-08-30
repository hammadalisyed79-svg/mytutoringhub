import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/lib/types";

/** Apply Boost / Highlight window to one subject listing (and legacy TutorAd mirror). */
export async function applyVisibilityToSubjectProfile(opts: {
  userId: string;
  subjectProfileId: string;
  plan: Extract<SubscriptionPlan, "AD_BOOST" | "HIGHLIGHTED_AD">;
  until: Date;
}): Promise<{ ok: true; subjectProfileId: string } | { ok: false; reason: string }> {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId: opts.userId },
    select: { id: true },
  });
  if (!tutor) return { ok: false, reason: "No tutor profile" };

  const listing = await prisma.subjectProfile.findFirst({
    where: { id: opts.subjectProfileId, tutorProfileId: tutor.id },
    select: { id: true, subject: true, boostUntil: true, highlightedUntil: true },
  });
  if (!listing) return { ok: false, reason: "Subject profile not found" };

  if (opts.plan === "AD_BOOST") {
    const boostUntil =
      listing.boostUntil && listing.boostUntil > opts.until ? listing.boostUntil : opts.until;
    await prisma.subjectProfile.update({
      where: { id: listing.id },
      data: { boostUntil },
    });
    await prisma.tutorAd
      .updateMany({
        where: { tutorProfileId: tutor.id, subject: listing.subject },
        data: { boostUntil },
      })
      .catch(() => undefined);
    // Keep account max for legacy dashboard widgets without cascading to other listings.
    await prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: { boostUntil },
    });
  } else {
    const highlightedUntil =
      listing.highlightedUntil && listing.highlightedUntil > opts.until
        ? listing.highlightedUntil
        : opts.until;
    await prisma.subjectProfile.update({
      where: { id: listing.id },
      data: { highlightedUntil },
    });
    await prisma.tutorAd
      .updateMany({
        where: { tutorProfileId: tutor.id, subject: listing.subject },
        data: { highlightedUntil },
      })
      .catch(() => undefined);
    await prisma.tutorProfile.update({
      where: { id: tutor.id },
      data: {
        highlighted: highlightedUntil > new Date(),
        highlightedUntil,
      },
    });
  }

  return { ok: true, subjectProfileId: listing.id };
}

/** Extend window based on the target listing's current end (not every listing). */
export async function resolveListingAddOnPeriodEnd(opts: {
  userId: string;
  plan: Extract<SubscriptionPlan, "AD_BOOST" | "HIGHLIGHTED_AD">;
  subjectProfileId: string | null;
  excludeSubId: string;
  /** 30 = standard boost; 365 = annual boost (~20% off vs 12×30-day). */
  durationDays?: number;
}): Promise<Date> {
  const now = new Date();
  const days = opts.durationDays && opts.durationDays > 0 ? opts.durationDays : 30;
  const prior = await prisma.subscription.findFirst({
    where: {
      userId: opts.userId,
      plan: opts.plan,
      status: { in: ["ACTIVE", "TRIALING"] },
      id: { not: opts.excludeSubId },
      currentPeriodEnd: { gt: now },
    },
    orderBy: { currentPeriodEnd: "desc" },
  });

  let base =
    prior?.currentPeriodEnd && prior.currentPeriodEnd > now ? prior.currentPeriodEnd : now;

  if (opts.subjectProfileId) {
    const listing = await prisma.subjectProfile.findFirst({
      where: {
        id: opts.subjectProfileId,
        tutorProfile: { userId: opts.userId },
      },
      select: { boostUntil: true, highlightedUntil: true },
    });
    if (opts.plan === "AD_BOOST" && listing?.boostUntil && listing.boostUntil > base) {
      base = listing.boostUntil;
    }
    if (
      opts.plan === "HIGHLIGHTED_AD" &&
      listing?.highlightedUntil &&
      listing.highlightedUntil > base
    ) {
      base = listing.highlightedUntil;
    }
  }

  return new Date(base.getTime() + days * 86400000);
}
