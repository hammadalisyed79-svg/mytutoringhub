import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/types";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user?.email || auth?.user?.id);

      const isAuthPage =
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/register/complete";

      const needsOnboarding =
        isLoggedIn &&
        auth?.user?.role !== "ADMIN" &&
        auth?.user?.onboardingComplete === false &&
        pathname !== "/register/complete" &&
        !pathname.startsWith("/api/");

      if (needsOnboarding) {
        return Response.redirect(new URL("/register/complete", request.nextUrl));
      }

      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/assistant") ||
        pathname.startsWith("/receipt") ||
        pathname.startsWith("/admin") ||
        pathname === "/ads/new";

      if (isAuthPage) {
        if (isLoggedIn && pathname !== "/register/complete") {
          if (auth?.user?.onboardingComplete === false) {
            return Response.redirect(new URL("/register/complete", request.nextUrl));
          }
          const dest = auth?.user?.role === "ADMIN" ? "/admin" : "/dashboard";
          return Response.redirect(new URL(dest, request.nextUrl));
        }
        return true;
      }

      if (isProtected) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.sub = user.id!;
        token.role = (user as { role?: Role }).role as Role;
        token.onboardingComplete = (user as { onboardingComplete?: boolean }).onboardingComplete ?? true;
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
} satisfies NextAuthConfig;
