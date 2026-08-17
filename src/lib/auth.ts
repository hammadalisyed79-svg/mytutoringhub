import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { googleConfigured, handleGoogleSignIn } from "@/lib/oauth";
import { sendLoginConfirmationEmail } from "@/lib/email";
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
  email: z.string().email(),
  password: z.string().min(6),
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
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    if (user.suspended) return null;
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

const googleProvider = googleConfigured()
  ? Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    })
  : null;

const providers: NextAuthConfig["providers"] = googleProvider
  ? [googleProvider, credentialsProvider]
  : [credentialsProvider];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  events: {
    async signIn({ user, account }) {
      if (!user.email || !user.id || user.role === "ADMIN") return;
      const method = account?.provider === "google" ? "google" : "password";
      await sendLoginConfirmationEmail({
        name: user.name || user.email.split("@")[0],
        email: user.email,
        method,
      }).catch((err) => console.error("[email] login confirmation failed", err));
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.email) {
        return true;
      }

      const result = await handleGoogleSignIn({
        email: user.email,
        name: user.name || (profile as { name?: string })?.name,
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
      } else if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true, onboardingComplete: true },
        });
        if (dbUser) {
          token.role = dbUser.role as Role;
          token.onboardingComplete = dbUser.onboardingComplete;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub || token.id) as string;
        session.user.role = token.role as Role;
        session.user.onboardingComplete = Boolean(token.onboardingComplete ?? true);
      }
      return session;
    },
  },
});
