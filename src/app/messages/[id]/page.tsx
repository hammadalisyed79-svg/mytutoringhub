import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/MessageThread";

type Params = { params: Promise<{ id: string }> };

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

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
        <MessageThread conversationId={id} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
