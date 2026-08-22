import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import { googleConfigured } from "@/lib/oauth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().min(5).max(254),
});

export type LoginHint = {
  exists: boolean;
  suspended?: boolean;
  hasPassword: boolean;
  oauthProviders: string[];
  googleEnabled: boolean;
  loginMethod: "none" | "password" | "google" | "microsoft" | "oauth_only";
  message?: string;
};

/** Tell the login UI whether to use Google, email/password, or sign up. */
export async function POST(req: Request) {
  let emailRaw = "";
  try {
    const body = schema.parse(await req.json());
    emailRaw = body.email;
  } catch {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      suspended: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  const googleEnabled = googleConfigured();
  const hint: LoginHint = {
    exists: Boolean(user),
    hasPassword: Boolean(user?.passwordHash),
    oauthProviders: user?.accounts.map((a) => a.provider) ?? [],
    googleEnabled,
    loginMethod: "none",
  };

  if (!user) {
    hint.loginMethod = "none";
    hint.message = "No account with this email. Sign up first, or use Google if you joined that way.";
    return NextResponse.json(hint);
  }

  if (user.suspended) {
    hint.suspended = true;
    hint.message = "This account is suspended. Email admin@mytutoringhub.com for help.";
    return NextResponse.json(hint);
  }

  const hasGoogle = hint.oauthProviders.includes("google");
  const hasMicrosoft = hint.oauthProviders.includes("microsoft-entra-id");

  if (!hint.hasPassword && (hasGoogle || hasMicrosoft)) {
    hint.loginMethod = "oauth_only";
    if (hasGoogle && googleEnabled) {
      hint.message =
        "This account uses Google sign-in — tap Log in with Google above. To add a password, sign in with Google first, then open Settings → New password.";
    } else if (hasMicrosoft) {
      hint.message =
        "This account uses Microsoft sign-in. Use that button above, or set a password in Settings after signing in.";
    } else {
      hint.message = "This account uses social sign-in, not email and password.";
    }
    return NextResponse.json(hint);
  }

  if (hint.hasPassword) {
    hint.loginMethod = "password";
    hint.message = "Enter the password you chose at sign-up. Forgot it? Use Forgot password.";
    return NextResponse.json(hint);
  }

  hint.loginMethod = "none";
  hint.message = "No password on this account yet. Sign up again or contact admin@mytutoringhub.com.";
  return NextResponse.json(hint);
}
