import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const REPORT_CATEGORIES = [
  "HARASSMENT",
  "SCAM",
  "SPAM",
  "IMPERSONATION",
  "UNDERAGE_SAFETY",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
] as const;

const schema = z.object({
  targetType: z.enum(["TUTOR", "STUDENT_AD", "USER"]),
  targetId: z.string().min(1),
  category: z.enum(REPORT_CATEGORIES).default("OTHER"),
  reason: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = schema.parse(await req.json());
  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      category: data.category,
      reason: data.reason,
      status: "OPEN",
    },
  });
  return NextResponse.json(report);
}
