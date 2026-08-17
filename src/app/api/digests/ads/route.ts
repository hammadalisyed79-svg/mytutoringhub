import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Lightweight tutor digest of new student ads.
 * Protect with CRON_SECRET (Authorization: Bearer …) or DIGEST_SECRET query param.
 * Feature-flags off when RESEND_API_KEY is missing (emails are logged only).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET || process.env.DIGEST_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = url.searchParams.get("secret");

  if (!secret || (bearer !== secret && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 86400000);
  const ads = await prisma.studentAd.findMany({
    where: { status: "OPEN", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  if (ads.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_ads" });
  }

  const tutors = await prisma.user.findMany({
    where: {
      role: "TUTOR",
      suspended: false,
      subscriptions: { some: { plan: "TUTOR_BASIC", status: { in: ["ACTIVE", "TRIALING"] } } },
      tutorProfile: { isNot: null },
    },
    include: { tutorProfile: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";
  let sent = 0;

  for (const tutor of tutors) {
    const subjects = (tutor.tutorProfile?.subjects || "")
      .toLowerCase()
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const matches = ads.filter((ad) =>
      subjects.some((s) => ad.subject.toLowerCase().includes(s) || s.includes(ad.subject.toLowerCase())),
    );
    if (matches.length === 0) continue;

    const list = matches
      .slice(0, 8)
      .map(
        (ad) =>
          `<li><strong>${ad.title}</strong> — ${ad.subject}, ${ad.location} (<a href="${appUrl}/ads">${ad.level}</a>)</li>`,
      )
      .join("");

    await sendEmail({
      to: tutor.email,
      subject: `${matches.length} new student request${matches.length === 1 ? "" : "s"} on My Tutoring Hub`,
      html: `<p>Hi ${tutor.name},</p><p>New student ads matching your subjects:</p><ul>${list}</ul><p><a href="${appUrl}/ads">Browse all student ads</a></p>`,
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, ads: ads.length, tutors: tutors.length });
}
