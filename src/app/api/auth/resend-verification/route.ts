import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canResendVerification, issueEmailVerification } from "@/lib/email-verification";
import { emailFromAddress } from "@/lib/email";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, emailVerified: true, role: true },
  });
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
