import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (
    req.nextUrl.pathname.startsWith("/admin") &&
    req.auth?.user &&
    req.auth.user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/messages/:path*",
    "/settings/:path*",
    "/assistant/:path*",
    "/ads/new",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
