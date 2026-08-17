import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, verifyEmailHtml } from "@/lib/email";

const TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashEmailToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueEmailVerification(user: {
  id: string;
  name: string;
  email: string;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.emailVerificationToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "Confirm your email · My Tutoring Hub",
    html: verifyEmailHtml(user.name, verifyUrl),
  });
  return { expiresAt };
}

export async function canResendVerification(userId: string) {
  const latest = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return { ok: true as const };
  const waitMs = RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime());
  if (waitMs > 0) {
    return { ok: false as const, waitSeconds: Math.ceil(waitMs / 1000) };
  }
  return { ok: true as const };
}

export async function isEmailVerified(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, role: true },
  });
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return Boolean(user.emailVerified);
}
