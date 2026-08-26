import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { NextAuthConfig } from "next-auth";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig, SESSION_MAX_AGE_SEC } from "@/lib/auth.config";
import {
  googleClientId,
  googleClientSecret,
  googleConfigured,
  handleOAuthSignIn,
  isOAuthProvider,
  loginConfirmationMethod,
  microsoftConfigured,
  resolveOAuthEmail,
} from "@/lib/oauth";
import { sendLoginConfirmationEmail } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import { resolveOAuthDisplayName } from "@/lib/display-name";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    onboardingComplete?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      onboardingComplete: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    onboardingComplete?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().min(5).max(254),
  password: z.string().min(8),
});

const credentialsProvider = Credentials({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(raw) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    const email = normalizeEmail(parsed.data.email);
    if (!isValidEmail(email)) return null;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    if (user.suspended) return null;
    if (!user.emailVerified) return null;
    const ok = await compare(parsed.data.password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      onboardingComplete: user.onboardingComplete,
    };
  },
});

function authProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = [credentialsProvider];
  if (googleConfigured()) {
    providers.unshift(
      Google({
        clientId: googleClientId(),
        clientSecret: googleClientSecret(),
        allowDangerousEmailAccountLinking: false,
        authorization: { params: { scope: "openid email profile" } },
        profile(profile) {
          return {
            id: profile.sub,
            name: resolveOAuthDisplayName(profile) || profile.name,
            email: resolveOAuthEmail({ email: profile.email, profile }) ?? profile.email ?? "",
            image: profile.picture,
            role: "STUDENT",
            onboardingComplete: true,
          };
        },
      }),
    );
  }
  if (microsoftConfigured()) {
    providers.unshift(
      MicrosoftEntraID({
        name: "Microsoft",
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        issuer: process.env.MICROSOFT_ISSUER || "https://login.microsoftonline.com/common/v2.0",
        authorization: { params: { scope: "openid profile email" } },
        allowDangerousEmailAccountLinking: false,
        profile(profile) {
          return {
            id: profile.sub,
            name: resolveOAuthDisplayName(profile) || profile.name,
            email: resolveOAuthEmail({ email: profile.email, profile }) ?? profile.email ?? "",
            image: null,
            role: "STUDENT",
            onboardingComplete: true,
          };
        },
      }),
    );
  }
  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  ...authConfig,
  providers: authProviders(),
  events: {
    async signIn({ user, account }) {
      if (!user.email || !user.id || user.role === "ADMIN") return;
      if (!isOAuthProvider(account?.provider)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });
        if (!dbUser?.emailVerified) return;
      }
      await sendLoginConfirmationEmail({
        name: user.name || user.email.split("@")[0],
        email: user.email,
        method: loginConfirmationMethod(account?.provider),
      }).catch((err) => console.error("[email] login confirmation failed", err));
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!isOAuthProvider(account?.provider)) {
        return true;
      }

      const email = resolveOAuthEmail({ email: user.email, profile });
      if (!email) return false;

      const result = await handleOAuthSignIn({
        email,
        name: resolveOAuthDisplayName(profile) || user.name,
        image: user.image || (profile as { picture?: string })?.picture,
        account,
      });

      if (!result.ok) return false;

      const dbUser = result.user;
      user.id = dbUser.id;
      user.role = dbUser.role as Role;
      user.name = dbUser.name;
      user.onboardingComplete = dbUser.onboardingComplete;

      if ("redirect" in result && result.redirect) {
        return result.redirect;
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.sub = user.id!;
        token.role = user.role as Role;
        token.onboardingComplete = user.onboardingComplete ?? true;
        if (user.name) token.name = user.name;
        return token;
      }
      const issued = Number(token.iat || 0);
      if (issued && Date.now() / 1000 - issued > SESSION_MAX_AGE_SEC) {
        return null;
      }
      if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true, onboardingComplete: true, name: true },
        });
        if (dbUser) {
          token.role = dbUser.role as Role;
          token.onboardingComplete = dbUser.onboardingComplete;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub || token.id) as string;
        session.user.role = token.role as Role;
        session.user.onboardingComplete = Boolean(token.onboardingComplete ?? true);
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
}));
