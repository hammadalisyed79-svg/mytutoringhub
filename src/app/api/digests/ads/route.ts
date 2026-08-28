import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, studentAdDigestHtml } from "@/lib/email";

export const runtime = "nodejs";

const ADS_DIGEST_SEQUENCE = "ads_digest_weekly";

function weekKey(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.floor((date.getTime() - start.getTime()) / (7 * 86400000));
  return `${date.getUTCFullYear()}-w${week}`;
}

/**
 * Lightweight tutor digest of new student requests (StudentAd).
 * Protect with CRON_SECRET (Authorization: Bearer …) only.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.DIGEST_SECRET;
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!secret || bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const digestSequence = `${ADS_DIGEST_SEQUENCE}_${weekKey()}`;
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
      emailVerified: { not: null },
      tutorProfile: {
        is: {
          active: true,
          OR: [
            { subjectProfiles: { some: { status: "ACTIVE" } } },
            { subjects: { not: "" } },
          ],
        },
      },
    },
    include: {
      tutorProfile: {
        include: {
          subjectProfiles: {
            where: { status: "ACTIVE" },
            select: { subject: true },
          },
        },
      },
    },
    take: 200,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.mytutoringhub.com";
  let sent = 0;
  let skipped = 0;

  for (const tutor of tutors) {
    const fromListings = (tutor.tutorProfile?.subjectProfiles || []).map((p) =>
      p.subject.toLowerCase().trim(),
    );
    const fromCsv = (tutor.tutorProfile?.subjects || "")
      .toLowerCase()
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const subjects = [...new Set([...fromListings, ...fromCsv].filter(Boolean))];
    const matches = ads.filter((ad) =>
      subjects.some(
        (s) => ad.subject.toLowerCase().includes(s) || s.includes(ad.subject.toLowerCase()),
      ),
    );
    if (matches.length === 0) continue;

    const alreadySent = await prisma.emailSequenceEvent.findUnique({
      where: { userId_sequence: { userId: tutor.id, sequence: digestSequence } },
    });
    if (alreadySent) {
      skipped += 1;
      continue;
    }

    const list = matches
      .slice(0, 8)
      .map(
        (ad) =>
          `<li><strong>${ad.title}</strong> — ${ad.subject}, ${ad.location} (${ad.level})</li>`,
      )
      .join("");

    try {
      await sendEmail({
        to: tutor.email,
        subject: `${matches.length} new student request${matches.length === 1 ? "" : "s"} on My Tutoring Hub`,
        html: studentAdDigestHtml({
          name: tutor.name,
          listHtml: list,
          adsUrl: `${appUrl}/ads`,
        }),
      });
      await prisma.emailSequenceEvent.create({
        data: { userId: tutor.id, sequence: digestSequence },
      });
      sent += 1;
    } catch (err) {
      console.error("[digest] failed", tutor.id, err);
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, ads: ads.length, tutors: tutors.length });
}
