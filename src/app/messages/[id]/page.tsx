import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/MessageThread";
import { MessagesAccountBanner } from "@/components/MessagesAccountBanner";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ emailAlert?: string }>;

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const emailAlertFailed = sp.emailAlert === "failed";

  if (session.user.role !== "ADMIN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, suspended: true },
    });
    if (me?.suspended) redirect("/dashboard");
  }

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) notFound();
  if (
    conversation.userAId !== session.user.id &&
    conversation.userBId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    redirect("/messages");
  }

  return (
    <div className="page">
      <div className="container narrow" style={{ width: "min(720px, calc(100% - 2rem))" }}>
        <MessagesAccountBanner email={session.user.email || ""} role={session.user.role} />
        <MessageThread
          conversationId={id}
          currentUserId={session.user.id}
          viewerRole={session.user.role}
          emailAlertFailed={emailAlertFailed}
        />
      </div>
    </div>
  );
}
