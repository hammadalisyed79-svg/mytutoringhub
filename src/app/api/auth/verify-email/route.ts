import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashEmailToken } from "@/lib/email-verification";
import { runPostVerifySequence } from "@/lib/email-sequences";
import { syncTutorBadges } from "@/lib/subscription";
import { trackProductEvent } from "@/lib/product-events";

export const runtime = "nodejs";

/** Prefer request origin so redirects never depend on a malformed NEXT_PUBLIC_APP_URL. */
function redirectTo(req: Request, pathWithQuery: string, status: 303 | 307 = 303) {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return NextResponse.redirect(new URL(path, req.url), status);
}

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") || "";
  return accept.includes("application/json");
}

/** Form POST → 303 + absolute URL from request; JSON clients get a relative path. */
function finish(req: Request, pathWithQuery: string) {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  if (wantsJson(req)) {
    return NextResponse.json({ ok: true, redirectTo: path });
  }
  return redirectTo(req, path, 303);
}

async function consumeVerificationToken(token: string): Promise<
  | { ok: true; already: boolean }
  | { ok: false; reason: "invalid" | "expired" }
> {
  const tokenHash = hashEmailToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, emailVerified: true, role: true } } },
  });

  if (!record) {
    return { ok: false, reason: "invalid" };
  }

  const now = new Date();
  const alreadyVerified = Boolean(record.user.emailVerified);

  // Token already used (we set expiresAt to the past on first success).
  if (record.expiresAt < now) {
    if (alreadyVerified) return { ok: true, already: true };
    return { ok: false, reason: "expired" };
  }

  if (alreadyVerified) {
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { expiresAt: new Date(0) },
    });
    return { ok: true, already: true };
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  });

  // Mark this token used; drop any other pending tokens for the user.
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { expiresAt: new Date(0) },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  trackProductEvent("email_verified", { userId: record.userId });

  if (record.user.role === "TUTOR") {
    await syncTutorBadges(record.userId).catch((err) => {
      console.error("[verify-email] syncTutorBadges failed", record.userId, err);
    });
  }

  void runPostVerifySequence(record.userId).catch((err) => {
    console.error("[verify-email] onboarding sequence failed", record.userId, err);
  });

  return { ok: true, already: false };
}

/** Old email links hit GET — send them to the confirm page (avoids scanner auto-consume). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return redirectTo(req, "/login?verify=invalid", 307);
  const dest = new URL("/verify-email", req.url);
  dest.searchParams.set("token", token);
  return NextResponse.redirect(dest, 307);
}

export async function POST(req: Request) {
  let token = "";
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { token?: string };
      token = String(body.token || "");
    } else {
      const fd = await req.formData();
      token = String(fd.get("token") || "");
    }
  } catch {
    return finish(req, "/login?verify=invalid");
  }

  if (!token) return finish(req, "/login?verify=invalid");

  const result = await consumeVerificationToken(token);
  if (!result.ok) {
    return finish(
      req,
      result.reason === "expired" ? "/login?verify=expired" : "/login?verify=invalid",
    );
  }

  const session = await auth();
  if (session?.user) {
    return finish(req, "/dashboard?verified=1");
  }
  return finish(req, "/login?verified=1");
}
