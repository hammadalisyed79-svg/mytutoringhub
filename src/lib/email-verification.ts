import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, verifyEmailHtml } from "@/lib/email";

const TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashEmailToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sanitizedAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\r\n\0]/g, "")
    .replace(/\/+$/, "");
}

export function emailVerificationUrl(token: string) {
  const appUrl = sanitizedAppUrl();
  // Landing page requires a button click — email scanners that prefetch GET
  // links cannot consume the token and falsely expire it.
  return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

/** Mint a fresh verification token (replaces any prior token for this user). */
export async function mintEmailVerificationToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return { token, expiresAt };
}

/** Fresh verify link for cron/reminder emails — no message sent. */
export async function createEmailVerificationLink(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (!user || user.emailVerified) return null;
  const { token } = await mintEmailVerificationToken(userId);
  return emailVerificationUrl(token);
}

export async function issueEmailVerification(user: {
  id: string;
  name: string;
  email: string;
}) {
  const { token } = await mintEmailVerificationToken(user.id);
  const verifyUrl = emailVerificationUrl(token);
  await sendEmail({
    to: user.email,
    subject: "Confirm your email · My Tutoring Hub",
    html: verifyEmailHtml(user.name, verifyUrl),
    text: `Hi ${user.name},\n\nPlease confirm your email for My Tutoring Hub:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nSent from admin@mytutoringhub.com`,
  });
  return { expiresAt: new Date(Date.now() + TTL_MS) };
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
