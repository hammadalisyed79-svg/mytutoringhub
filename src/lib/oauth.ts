import { cookies } from "next/headers";
import type { Account } from "@auth/core/types";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import type { Role } from "@/lib/types";

export const OAUTH_INTENT_COOKIE = "oauth_intent";
export const OAUTH_PROVIDERS = ["google", "microsoft-entra-id"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number];

export type OAuthIntent = {
  intent: "login" | "register";
  role?: "STUDENT" | "TUTOR";
};

type DbUser = Awaited<ReturnType<typeof prisma.user.findUnique>> & {};

function envPairConfigured(id?: string, secret?: string) {
  const clientId = id || "";
  const clientSecret = secret || "";
  return Boolean(
    clientId &&
      clientSecret &&
      !clientId.includes("replace") &&
      !clientSecret.includes("replace"),
  );
}

export function googleConfigured() {
  return envPairConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
}

export function microsoftConfigured() {
  return envPairConfigured(process.env.MICROSOFT_CLIENT_ID, process.env.MICROSOFT_CLIENT_SECRET);
}

export function oauthConfigured() {
  return googleConfigured() || microsoftConfigured();
}

export function isOAuthProvider(provider?: string | null): provider is OAuthProviderId {
  return provider === "google" || provider === "microsoft-entra-id";
}

export function loginConfirmationMethod(
  provider?: string | null,
): "password" | "google" | "microsoft" {
  if (provider === "google") return "google";
  if (provider === "microsoft-entra-id") return "microsoft";
  return "password";
}

export function resolveOAuthEmail(opts: {
  email?: string | null;
  profile?: unknown;
}): string | null {
  const profile = opts.profile as
    | { email?: string | null; preferred_username?: string | null }
    | undefined;
  const candidates = [opts.email, profile?.email, profile?.preferred_username];
  for (const raw of candidates) {
    if (!raw) continue;
    const email = normalizeEmail(raw);
    if (isValidEmail(email)) return email;
  }
  return null;
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

async function linkOAuthAccount(userId: string, account: Account) {
  const sessionState =
    typeof account.session_state === "string" ? account.session_state : undefined;
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
      refresh_token: account.refresh_token ?? undefined,
      access_token: account.access_token ?? undefined,
      expires_at: account.expires_at ?? undefined,
      token_type: account.token_type ?? undefined,
      scope: account.scope ?? undefined,
      id_token: account.id_token ?? undefined,
      session_state: sessionState,
    },
    update: {
      refresh_token: account.refresh_token ?? undefined,
      access_token: account.access_token ?? undefined,
      expires_at: account.expires_at ?? undefined,
      token_type: account.token_type ?? undefined,
      scope: account.scope ?? undefined,
      id_token: account.id_token ?? undefined,
      session_state: sessionState,
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

export async function handleOAuthSignIn(opts: {
  email: string;
  name?: string | null;
  image?: string | null;
  account: Account;
}) {
  const email = normalizeEmail(opts.email);
  if (!isValidEmail(email)) return { ok: false as const, reason: "invalid-email" };

  const intent = await readOAuthIntent();
  await clearOAuthIntent();

  let dbUser = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;
  const image = opts.image && !opts.image.startsWith("data:") ? opts.image : null;

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
        image,
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
        ...(image && !dbUser.image ? { image } : {}),
        ...(dbUser.emailVerified ? {} : { emailVerified: new Date() }),
      },
    });
    dbUser = await prisma.user.findUniqueOrThrow({ where: { id: dbUser.id } });
  }

  await linkOAuthAccount(dbUser.id, opts.account);

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
