import { cookies } from "next/headers";
import type { Account } from "@auth/core/types";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import type { Role } from "@/lib/types";

export const OAUTH_INTENT_COOKIE = "oauth_intent";

export type OAuthIntent = {
  intent: "login" | "register";
  role?: "STUDENT" | "TUTOR";
};

type DbUser = Awaited<ReturnType<typeof prisma.user.findUnique>> & {};

export function googleConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID || "";
  const secret = process.env.GOOGLE_CLIENT_SECRET || "";
  return Boolean(id && secret && !id.includes("replace") && !secret.includes("replace"));
}

export function encodeOAuthIntent(intent: OAuthIntent) {
  return Buffer.from(JSON.stringify(intent)).toString("base64url");
}

export async function readOAuthIntent(): Promise<OAuthIntent | null> {
  const raw = (await cookies()).get(OAUTH_INTENT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthIntent;
    if (parsed.intent !== "login" && parsed.intent !== "register") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearOAuthIntent() {
  (await cookies()).delete(OAUTH_INTENT_COOKIE);
}

async function linkGoogleAccount(userId: string, account: Account) {
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    create: {
      userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    },
    update: {
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    },
  });
}

async function createTutorProfile(userId: string) {
  const existing = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.tutorProfile.create({
    data: {
      userId,
      bio: "New tutor — update your profile in the dashboard.",
      subjects: "",
      hourlyRate: 1500,
      location: "Online",
      online: true,
      inPerson: false,
      active: false,
    },
  });
}

export async function handleGoogleSignIn(opts: {
  email: string;
  name?: string | null;
  image?: string | null;
  account: Account;
}) {
  const email = opts.email.toLowerCase();
  const intent = await readOAuthIntent();
  await clearOAuthIntent();

  let dbUser = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;

  if (!dbUser) {
    isNewUser = true;
    const role: Role =
      intent?.intent === "register" && intent.role === "TUTOR" ? "TUTOR" : "STUDENT";
    const needsOnboarding = intent?.intent === "login";

    dbUser = await prisma.user.create({
      data: {
        name: opts.name?.trim() || email.split("@")[0],
        email,
        role,
        image: opts.image || null,
        emailVerified: new Date(),
        onboardingComplete: !needsOnboarding,
      },
    });

    if (role === "TUTOR") {
      await createTutorProfile(dbUser.id);
    }

    await sendEmail({
      to: email,
      subject: "Welcome to My Tutoring Hub",
      html: welcomeEmailHtml(dbUser.name, role),
    }).catch((err) => console.error("[email] welcome failed", err));
  } else {
    if (dbUser.suspended) return { ok: false as const, reason: "suspended" };
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...(opts.image && !dbUser.image ? { image: opts.image } : {}),
        ...(dbUser.emailVerified ? {} : { emailVerified: new Date() }),
      },
    });
    dbUser = await prisma.user.findUniqueOrThrow({ where: { id: dbUser.id } });
  }

  await linkGoogleAccount(dbUser.id, opts.account);

  if (isNewUser && intent?.intent === "login") {
    return { ok: true as const, user: dbUser as DbUser, isNewUser, redirect: "/register/complete" };
  }

  return { ok: true as const, user: dbUser as DbUser, isNewUser };
}

export async function completeOnboarding(userId: string, role: Role) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tutorProfile: true },
  });
  if (!user) throw new Error("User not found");

  await prisma.user.update({
    where: { id: userId },
    data: { role, onboardingComplete: true },
  });

  if (role === "TUTOR" && !user.tutorProfile) {
    await createTutorProfile(userId);
  }

  return { role };
}
