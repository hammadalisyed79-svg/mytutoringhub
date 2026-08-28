import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import { googleConfigured } from "@/lib/oauth";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().min(5).max(254),
});

export type LoginHint = {
  exists?: boolean;
  suspended?: boolean;
  emailVerified?: boolean;
  googleEnabled: boolean;
  loginMethod: "none" | "password" | "google" | "microsoft" | "oauth_only";
  message?: string;
};

/** Tell the login UI whether to use Google, email/password, or sign up. */
export async function POST(req: Request) {
  const limited = enforceAuthRateLimit(req, "login-hint", 30, 15 * 60 * 1000);
  if (limited) return limited;

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
      emailVerified: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  const googleEnabled = googleConfigured();
  const genericUnknown = {
    exists: false as const,
    googleEnabled,
    loginMethod: "none" as const,
    message:
      "If you have an account, enter your password below or use Google sign-in. Otherwise sign up first.",
  };

  if (!user) {
    return NextResponse.json(genericUnknown);
  }

  const hint: LoginHint = {
    exists: true,
    googleEnabled,
    loginMethod: "none",
  };

  if (user.suspended) {
    hint.suspended = true;
    hint.message = "This account is suspended. Email admin@mytutoringhub.com for help.";
    return NextResponse.json(hint);
  }

  if (!user.emailVerified) {
    hint.emailVerified = false;
    hint.loginMethod = "none";
    hint.message =
      "Verify your email before signing in. Open the confirmation link we sent, then try again.";
    return NextResponse.json(hint);
  }

  hint.emailVerified = true;

  const oauthProviders = user.accounts.map((a) => a.provider);
  const hasGoogle = oauthProviders.includes("google");
  const hasMicrosoft = oauthProviders.includes("microsoft-entra-id");
  const hasPassword = Boolean(user.passwordHash);

  if (!hasPassword && (hasGoogle || hasMicrosoft)) {
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

  if (hasPassword) {
    hint.loginMethod = "password";
    hint.message = "Enter your password. Forgot it? Use Forgot password below.";
    return NextResponse.json(hint);
  }

  hint.message = "Use Google sign-in or contact admin@mytutoringhub.com if you need help.";
  return NextResponse.json(hint);
}
