import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteSettings } from "@/lib/site-settings";
import {
  encodeOAuthIntent,
  oauthConfigured,
  OAUTH_INTENT_COOKIE,
  type OAuthIntent,
} from "@/lib/oauth";

export const runtime = "nodejs";

const schema = z.object({
  intent: z.enum(["login", "register"]),
  role: z.enum(["STUDENT", "TUTOR"]).optional(),
});

export async function POST(req: Request) {
  if (!oauthConfigured()) {
    return NextResponse.json({ error: "Social sign-in is not configured yet" }, { status: 503 });
  }

  const body = schema.parse(await req.json());
  if (body.intent === "register") {
    const settings = await getSiteSettings();
    if (settings.disableSignups) {
      return NextResponse.json({ error: "New registrations are temporarily closed" }, { status: 403 });
    }
  }

  const intent: OAuthIntent = {
    intent: body.intent,
    ...(body.role ? { role: body.role } : {}),
  };

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_INTENT_COOKIE, encodeOAuthIntent(intent), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
