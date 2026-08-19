import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const runtime = "nodejs";

// Mock subscription data — TODO: replace with Prisma query
const MOCK_SUBSCRIPTIONS = [
  {
    id: "sub_1",
    userId: "user_1",
    userName: "Alice Johnson",
    userEmail: "alice@example.com",
    role: "tutor",
    plan: "pro",
    status: "active",
    billingPeriod: "monthly",
    currency: "GBP",
    priceAmount: 9.99,
    startDate: "2026-01-15T00:00:00Z",
    endDate: null,
    notes: null,
  },
  {
    id: "sub_2",
    userId: "user_2",
    userName: "Bob Smith",
    userEmail: "bob@example.com",
    role: "tutor",
    plan: "elite",
    status: "active",
    billingPeriod: "annual",
    currency: "GBP",
    priceAmount: 191.88,
    startDate: "2026-03-01T00:00:00Z",
    endDate: "2027-03-01T00:00:00Z",
    notes: null,
  },
  {
    id: "sub_3",
    userId: "user_3",
    userName: "Carol Williams",
    userEmail: "carol@example.com",
    role: "student",
    plan: "study_plus",
    status: "active",
    billingPeriod: "monthly",
    currency: "GBP",
    priceAmount: 4.99,
    startDate: "2026-05-10T00:00:00Z",
    endDate: null,
    notes: null,
  },
  {
    id: "sub_4",
    userId: "user_4",
    userName: "David Brown",
    userEmail: "david@example.com",
    role: "student",
    plan: "study_pro",
    status: "cancelled",
    billingPeriod: "monthly",
    currency: "USD",
    priceAmount: 11.99,
    startDate: "2025-11-01T00:00:00Z",
    endDate: "2026-04-01T00:00:00Z",
    notes: "Cancelled by user",
  },
  {
    id: "sub_5",
    userId: "user_5",
    userName: "Emma Davis",
    userEmail: "emma@example.com",
    role: "tutor",
    plan: "pro",
    status: "trial",
    billingPeriod: "monthly",
    currency: "GBP",
    priceAmount: 0,
    startDate: "2026-08-01T00:00:00Z",
    endDate: "2026-08-15T00:00:00Z",
    notes: "14-day trial",
  },
  {
    id: "sub_6",
    userId: "user_6",
    userName: "Frank Miller",
    userEmail: "frank@example.com",
    role: "tutor",
    plan: "elite",
    status: "active",
    billingPeriod: "monthly",
    currency: "USD",
    priceAmount: 24.99,
    startDate: "2026-06-01T00:00:00Z",
    endDate: null,
    notes: null,
  },
  {
    id: "sub_7",
    userId: "user_7",
    userName: "Grace Lee",
    userEmail: "grace@example.com",
    role: "student",
    plan: "study_plus",
    status: "expired",
    billingPeriod: "annual",
    currency: "GBP",
    priceAmount: 47.88,
    startDate: "2025-07-01T00:00:00Z",
    endDate: "2026-07-01T00:00:00Z",
    notes: null,
  },
];

const overrideSchema = z.object({
  subscriptionId: z.string(),
  plan: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // TODO: replace with Prisma query
  return NextResponse.json({ subscriptions: MOCK_SUBSCRIPTIONS });
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

  // TODO: replace with Prisma update
  return NextResponse.json({
    ok: true,
    message: "Plan updated (demo mode — payment integration pending)",
    updated: parsed.data,
  });
}
