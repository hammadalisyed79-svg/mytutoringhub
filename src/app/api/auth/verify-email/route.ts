import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEmailToken } from "@/lib/email-verification";
import { runPostVerifySequence } from "@/lib/email-sequences";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?verify=invalid`);
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashEmailToken(token) },
  });
  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    }
    return NextResponse.redirect(`${appUrl}/login?verify=expired`);
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });
  await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });

  void runPostVerifySequence(record.userId).catch((err) => {
    console.error("[verify-email] onboarding sequence failed", record.userId, err);
  });

  const session = await auth();
  if (session?.user) {
    return NextResponse.redirect(`${appUrl}/dashboard?verified=1`);
  }
  return NextResponse.redirect(`${appUrl}/login?verified=1`);
}
