import { connection } from "next/server";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteNav } from "@/components/SiteNav";
import { prisma } from "@/lib/prisma";
import { microsoftConfigured } from "@/lib/oauth";

export async function SiteHeader() {
  await connection();
  const session = await auth();
  let unread = 0;
  if (session?.user?.id) {
    unread = await prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: session.user.id },
        conversation: {
          OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
        },
      },
    });
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo-link" aria-label="My Tutoring Hub home">
          <Logo />
        </Link>
        <SiteNav
          user={
            session?.user
              ? {
                  name: session.user.name,
                  email: session.user.email,
                  role: session.user.role,
                  unreadCount: unread,
                }
              : null
          }
          googleEnabled
          microsoftEnabled={microsoftConfigured()}
        />
      </div>
    </header>
  );
}
