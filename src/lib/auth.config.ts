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

      const isAuthPage = pathname === "/login" || pathname === "/register";
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/assistant") ||
        pathname.startsWith("/receipt") ||
        pathname.startsWith("/admin") ||
        pathname === "/ads/new";

      if (isAuthPage) {
        if (isLoggedIn) {
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
        // Prefer explicit id; Auth.js also sets token.sub from user.id.
        token.id = user.id!;
        token.sub = user.id!;
        token.role = (user as { role?: Role }).role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // token.sub is the stable Auth.js subject; token.id is our custom claim.
        session.user.id = (token.sub || token.id) as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
