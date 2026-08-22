import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/MessageThread";
import { MessagesAccountBanner } from "@/components/MessagesAccountBanner";

type Params = { params: Promise<{ id: string }> };

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  if (session.user.role !== "ADMIN") {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, suspended: true },
    });
    if (me?.suspended) redirect("/dashboard");
    if (!me?.emailVerified) redirect("/dashboard?verify=1");
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
        />
      </div>
    </div>
  );
}
