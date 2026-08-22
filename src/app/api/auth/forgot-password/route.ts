import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import {
  createPasswordResetToken,
  passwordResetUrl,
  verifyPasswordResetToken,
} from "@/lib/password-reset-token";

export const runtime = "nodejs";

const requestSchema = z.object({
  email: z.string().min(5).max(254),
});

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(100),
});

function resetEmailHtml(name: string, url: string, isNewPassword: boolean) {
  const action = isNewPassword ? "Set your password" : "Reset your password";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">
<p>Hi ${name},</p>
<p>${isNewPassword ? "Create a password" : "Reset your password"} for My Tutoring Hub:</p>
<p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0a4d42;color:#fff;text-decoration:none;border-radius:8px">${action}</a></p>
<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
<p>My Tutoring Hub · admin@mytutoringhub.com</p>
</body></html>`;
}

const GENERIC_OK =
  "If an account exists for that email, we sent a link from admin@mytutoringhub.com. Check inbox, junk, and promotions.";

/** Request a password set/reset link, or apply a new password from a reset token. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "reset") {
    let data: z.infer<typeof resetSchema>;
    try {
      data = resetSchema.parse(await req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: e.issues[0]?.message || "Password must be at least 8 characters" },
          { status: 400 },
        );
      }
      throw e;
    }

    const verified = verifyPasswordResetToken(data.token);
    if (!verified) {
      return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, email: true, suspended: true },
    });
    if (!user || user.suspended || normalizeEmail(user.email) !== normalizeEmail(verified.email)) {
      return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(data.password, 10) },
    });

    return NextResponse.json({
      ok: true,
      message: "Password saved. You can log in with email and password now.",
    });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      suspended: true,
      passwordHash: true,
    },
  });

  if (user && !user.suspended) {
    const token = createPasswordResetToken(user.id, user.email);
    const link = passwordResetUrl(token);
    const isNewPassword = !user.passwordHash;
    await sendEmail({
      to: user.email,
      subject: isNewPassword
        ? "Set your My Tutoring Hub password"
        : "Reset your My Tutoring Hub password",
      html: resetEmailHtml(user.name, link, isNewPassword),
      text: `Hi ${user.name},\n\n${isNewPassword ? "Set" : "Reset"} your password:\n${link}\n\nExpires in 1 hour.`,
    }).catch((err) => console.error("[email] password reset failed", err));
  }

  return NextResponse.json({ ok: true, message: GENERIC_OK });
}
