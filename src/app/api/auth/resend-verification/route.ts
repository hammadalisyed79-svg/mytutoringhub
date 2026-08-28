import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canResendVerification, issueEmailVerification } from "@/lib/email-verification";
import { emailFromAddress } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().min(5).max(254).optional(),
});

export async function POST(req: Request) {
  const limited = enforceAuthRateLimit(req, "resend-verification", 8, 15 * 60 * 1000);
  if (limited) return limited;

  const session = await auth();
  let bodyEmail: string | undefined;
  try {
    const json = await req.json().catch(() => ({}));
    bodyEmail = bodySchema.parse(json).email;
  } catch {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  let user:
    | {
        id: string;
        name: string;
        email: string;
        emailVerified: Date | null;
        role: string;
      }
    | null = null;

  if (session?.user) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, emailVerified: true, role: true },
    });
  } else if (bodyEmail) {
    const email = normalizeEmail(bodyEmail);
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerified: true, role: true },
    });
    // Do not reveal whether the email exists.
    if (!user || user.role === "ADMIN" || user.emailVerified) {
      return NextResponse.json({
        ok: true,
        sent: false,
        message: "If that email needs verification, we sent a fresh link.",
      });
    }
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "ADMIN" || user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const cooldown = await canResendVerification(user.id);
  if (!cooldown.ok) {
    return NextResponse.json(
      { error: `Please wait ${cooldown.waitSeconds}s before requesting another email.` },
      { status: 429 },
    );
  }

  try {
    await issueEmailVerification(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send verification email";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    to: user.email,
    from: emailFromAddress(),
  });
}
