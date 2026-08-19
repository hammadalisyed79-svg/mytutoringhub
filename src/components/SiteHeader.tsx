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
  let displayName = session?.user?.name ?? "";
  if (session?.user?.id) {
    const [unreadCount, me] = await Promise.all([
      prisma.message.count({
        where: {
          readAt: null,
          senderId: { not: session.user.id },
          conversation: {
            OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      }),
    ]);
    unread = unreadCount;
    if (me?.name) displayName = me.name;
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
                  name: displayName,
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
