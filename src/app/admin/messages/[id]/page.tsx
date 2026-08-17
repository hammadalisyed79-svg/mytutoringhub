import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminConversationPage({ params }: Params) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, name: true, email: true } },
      userB: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });
  if (!conversation) notFound();

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/messages">← Conversations</Link>
        </p>
        <h1 className="page-title">Thread</h1>
        <p className="muted">
          <Link href={`/admin/users/${conversation.userA.id}`}>{conversation.userA.name}</Link> ({conversation.userA.email})
          ↔ <Link href={`/admin/users/${conversation.userB.id}`}>{conversation.userB.name}</Link> (
          {conversation.userB.email})
        </p>
      </div>

      <div className="admin-actions">
        <AdminActionButton
          action="delete_conversation"
          id={conversation.id}
          label="Delete whole conversation"
          confirm="Delete this conversation and every message in it?"
          danger
        />
      </div>

      {conversation.messages.length === 0 && <p className="muted">No messages in this thread.</p>}

      <div className="thread-messages admin-thread">
        {conversation.messages.map((m) => (
          <article key={m.id} className="ad-row">
            <strong>{m.sender.name}</strong>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.body}</p>
            {m.attachmentUrl && (
              <p>
                <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                  Attachment
                </a>
              </p>
            )}
            <time className="muted">{m.createdAt.toLocaleString()}</time>
            <AdminActionButton
              action="delete_message"
              id={m.id}
              label="Delete message"
              confirm="Delete this message?"
              danger
            />
          </article>
        ))}
      </div>
    </>
  );
}
