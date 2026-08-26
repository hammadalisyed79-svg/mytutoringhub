import type { ReactNode } from "react";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Dashboard");

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  let verifyBanner: React.ReactNode = null;

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        emailVerified: true,
        role: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
      },
    });

    if (user && user.role !== "ADMIN" && !user.emailVerified) {
      const oauthProviders = user.accounts.map((a) => a.provider);
      verifyBanner = (
        <div className="container dashboard-verify-banner-wrap">
          <EmailVerificationBanner
            email={user.email}
            oauthOnly={!user.passwordHash && oauthProviders.length > 0}
            oauthProviders={oauthProviders}
          />
        </div>
      );
    }
  }

  return (
    <>
      {verifyBanner}
      {children}
    </>
  );
}
