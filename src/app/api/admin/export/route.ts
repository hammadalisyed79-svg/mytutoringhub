import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { csvResponse } from "@/lib/admin-list";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = (req.nextUrl.searchParams.get("type") || "").toLowerCase();
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const status = req.nextUrl.searchParams.get("status") || "";
  const role = req.nextUrl.searchParams.get("role") || "";
  const action = req.nextUrl.searchParams.get("action") || "";
  const suspended = req.nextUrl.searchParams.get("suspended") || "";
  const verified = req.nextUrl.searchParams.get("verified") || "";
  const sub = req.nextUrl.searchParams.get("sub") || "";

  if (type === "users") {
    const where: Prisma.UserWhereInput = {};
    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { id: q },
        { role: q.toUpperCase() },
      ];
    }
    if (role) where.role = role;
    if (suspended === "1") where.suspended = true;
    if (suspended === "0") where.suspended = false;
    if (verified === "1") where.emailVerified = { not: null };
    if (verified === "0") where.emailVerified = null;
    if (sub === "1") {
      where.subscriptions = { some: { status: { in: ["ACTIVE", "TRIALING"] } } };
    }
    if (sub === "0") {
      where.subscriptions = { none: { status: { in: ["ACTIVE", "TRIALING"] } } };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING"] } },
          select: { plan: true },
        },
      },
    });

    return csvResponse(
      "users.csv",
      ["id", "name", "email", "role", "suspended", "emailVerified", "plans", "createdAt"],
      users.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.suspended,
        u.emailVerified ? "1" : "0",
        u.subscriptions.map((s) => s.plan).join("|"),
        u.createdAt.toISOString(),
      ]),
    );
  }

  if (type === "reports") {
    const reports = await prisma.report.findMany({
      where: !status || status === "ALL" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { reporter: { select: { name: true, email: true } } },
    });
    return csvResponse(
      "reports.csv",
      ["id", "status", "category", "targetType", "targetId", "reporterEmail", "reason", "createdAt"],
      reports.map((r) => [
        r.id,
        r.status,
        r.category,
        r.targetType,
        r.targetId,
        r.reporter.email,
        r.reason,
        r.createdAt.toISOString(),
      ]),
    );
  }

  if (type === "payments") {
    const payments = await prisma.subscription.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { plan: { contains: q, mode: "insensitive" } },
                { stripeSubscriptionId: { contains: q, mode: "insensitive" } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { user: { select: { name: true, email: true } } },
    });
    return csvResponse(
      "payments.csv",
      ["id", "userName", "userEmail", "plan", "status", "tracker", "periodEnd", "createdAt"],
      payments.map((s) => [
        s.id,
        s.user.name,
        s.user.email,
        s.plan,
        s.status,
        s.stripeSubscriptionId,
        s.currentPeriodEnd?.toISOString() ?? "",
        s.createdAt.toISOString(),
      ]),
    );
  }

  if (type === "audit") {
    const logs = await prisma.adminAuditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(q
          ? {
              OR: [
                { action: { contains: q, mode: "insensitive" } },
                { targetType: { contains: q, mode: "insensitive" } },
                { targetId: { contains: q, mode: "insensitive" } },
                { detail: { contains: q, mode: "insensitive" } },
                { admin: { email: { contains: q, mode: "insensitive" } } },
                { admin: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { admin: { select: { name: true, email: true } } },
    });
    return csvResponse(
      "audit.csv",
      ["id", "when", "adminName", "adminEmail", "action", "targetType", "targetId", "detail"],
      logs.map((row) => [
        row.id,
        row.createdAt.toISOString(),
        row.admin?.name ?? "",
        row.admin?.email ?? "",
        row.action,
        row.targetType,
        row.targetId,
        row.detail,
      ]),
    );
  }

  return NextResponse.json(
    { error: "Unknown export type. Use users, reports, payments, or audit." },
    { status: 400 },
  );
}
