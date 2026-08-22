import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 60 * 60 * 1000;

function resetSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(body: string) {
  return createHmac("sha256", resetSecret()).update(body).digest("hex");
}

/** Stateless signed token for password set/reset links (1 hour). */
export function createPasswordResetToken(userId: string, email: string) {
  const payload = {
    userId,
    email,
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyPasswordResetToken(token: string): { userId: string; email: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = sign(body);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId?: string;
      email?: string;
      exp?: number;
    };
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function passwordResetUrl(token: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
