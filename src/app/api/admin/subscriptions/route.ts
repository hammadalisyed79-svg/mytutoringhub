import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { syncTutorBadges } from "@/lib/subscription";
import { z } from "zod";

export const runtime = "nodejs";

const PLAN_LABELS: Record<string, string> = {
  STUDENT_PASS: "Student Pass",
  STUDENT_PRO: "Student Pro",
  TUTOR_BASIC: "Tutor Pro",
  VERIFIED_TUTOR: "Verified Tutor",
  HIGHLIGHTED_AD: "Highlighted Listing",
  AD_BOOST: "Profile Boost",
  EXTRA_PROFILE_ADS: "Extra Profile Ads",
  UNLIMITED_ADS: "Unlimited Profiles",
};

function serializeSub(s: {
  id: string;
  userId: string;
  plan: string;
  status: string;
  role: string | null;
  billingPeriod: string | null;
  currency: string | null;
  priceAmount: number | null;
  startDate: Date | null;
  endDate: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  notes: string | null;
  createdAt: Date;
  user: { name: string; email: string; role: string };
}) {
  const role =
    s.role?.toLowerCase() ||
    (s.user.role === "TUTOR" ? "tutor" : s.user.role === "STUDENT" ? "student" : s.user.role.toLowerCase());
  return {
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    role,
    plan: s.plan,
    planLabel: PLAN_LABELS[s.plan] ?? s.plan,
    status: s.status,
    billingPeriod: s.billingPeriod || "monthly",
    currency: s.currency || "GBP",
    priceAmount: s.priceAmount ?? 0,
    startDate: (s.startDate || s.createdAt).toISOString(),
    endDate: (s.endDate || s.currentPeriodEnd)?.toISOString() ?? null,
    cancelledAt: s.cancelledAt?.toISOString() ?? null,
    notes: s.notes,
  };
}

const overrideSchema = z.object({
  subscriptionId: z.string().min(1),
  plan: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = req.nextUrl.searchParams.get("format");
  const rows = await prisma.subscription.findMany({
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const subscriptions = rows.map(serializeSub);

  if (format === "csv") {
    const header = [
      "id",
      "userName",
      "userEmail",
      "role",
      "plan",
      "status",
      "billingPeriod",
      "currency",
      "priceAmount",
      "startDate",
      "endDate",
      "notes",
    ];
    const escape = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      header.join(","),
      ...subscriptions.map((s) =>
        [
          s.id,
          s.userName,
          s.userEmail,
          s.role,
          s.plan,
          s.status,
          s.billingPeriod,
          s.currency,
          s.priceAmount,
          s.startDate,
          s.endDate,
          s.notes,
        ]
          .map(escape)
          .join(","),
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="subscriptions.csv"',
      },
    });
  }

  return NextResponse.json({ subscriptions });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.subscription.findUnique({
    where: { id: parsed.data.subscriptionId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const status = parsed.data.status?.toUpperCase();
  const data: {
    plan?: string;
    status?: string;
    notes?: string | null;
    cancelledAt?: Date | null;
  } = {};
  if (parsed.data.plan) data.plan = parsed.data.plan;
  if (status) {
    data.status = status;
    if (status === "CANCELED" || status === "CANCELLED") {
      data.status = "CANCELED";
      data.cancelledAt = existing.cancelledAt ?? new Date();
    } else if (status === "ACTIVE" || status === "TRIALING") {
      data.cancelledAt = null;
    }
  }
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;

  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data,
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  if (updated.user.role === "TUTOR") {
    await syncTutorBadges(updated.userId).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    message: "Subscription updated",
    subscription: serializeSub(updated),
  });
}
