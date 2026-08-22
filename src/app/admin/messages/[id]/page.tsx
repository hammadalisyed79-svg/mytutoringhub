import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";
import { AdminResendMessageNotifyButton } from "@/components/AdminResendMessageNotifyButton";
import {
  AdminHighlightedMessageBody,
  AdminModerationBadge,
  AdminModerationReasons,
} from "@/components/AdminMessageModeration";
import { AdminSendWarningButton, AdminWarnAllButton } from "@/components/AdminSendWarningButton";
import { emailConfigured } from "@/lib/email";
import { conversationModerationSummary, scanMessages } from "@/lib/message-moderation";

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

  const scans = scanMessages(conversation.messages);
  const summary = conversationModerationSummary(scans.values());
  const flaggedSenders = new Set(
    conversation.messages
      .filter((m) => scans.get(m.id)?.flagged)
      .map((m) => m.senderId),
  );

  return (
    <>
      <div>
        <p className="muted">
          <Link href="/admin/messages">← Conversations</Link>
        </p>
        <h1 className="page-title">Thread</h1>
        <p className="muted">
          <Link href={`/admin/users/${conversation.userA.id}`}>{conversation.userA.name}</Link> (
          {conversation.userA.email}) ↔{" "}
          <Link href={`/admin/users/${conversation.userB.id}`}>{conversation.userB.name}</Link> (
          {conversation.userB.email})
        </p>
      </div>

      {summary.flagged ? (
        <div className="admin-mod-alert" id="flagged">
          <div className="admin-mod-row-head">
            <strong>Auto-detection flagged this thread</strong>
            <AdminModerationBadge result={summary} compact />
          </div>
          <AdminModerationReasons result={summary} />
          <div className="admin-actions" style={{ marginTop: "0.75rem" }}>
            <AdminWarnAllButton conversationId={conversation.id} count={flaggedSenders.size} />
          </div>
        </div>
      ) : null}

      <div className="admin-actions">
        <AdminActionButton
          action="delete_conversation"
          id={conversation.id}
          label="Delete whole conversation"
          confirm="Delete this conversation and every message in it?"
          danger
        />
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Email alerts go to the recipient&apos;s login email ({conversation.userA.email} /{" "}
          {conversation.userB.email}), not admin@. Resend must be configured on Vercel.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          Resend on server: <strong>{emailConfigured() ? "configured" : "NOT configured"}</strong>
        </p>
        <AdminResendMessageNotifyButton conversationId={conversation.id} />
      </div>

      {conversation.messages.length === 0 && <p className="muted">No messages in this thread.</p>}

      <div className="thread-messages admin-thread">
        {conversation.messages.map((m) => {
          const mod = scans.get(m.id)!;
          return (
            <article
              key={m.id}
              className={`ad-row admin-mod-message${mod.flagged ? " is-flagged" : ""}`}
              id={mod.flagged ? `flagged-${m.id}` : undefined}
            >
              <div className="admin-mod-row-head">
                <strong>{m.sender.name}</strong>
                <AdminModerationBadge result={mod} compact />
              </div>
              <AdminModerationReasons result={mod} />
              <AdminHighlightedMessageBody body={m.body} result={mod} />
              {m.attachmentUrl && (
                <p>
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                    Attachment
                  </a>
                </p>
              )}
              <time className="muted">{m.createdAt.toLocaleString()}</time>
              <div className="admin-actions">
                {mod.flagged ? (
                  <AdminSendWarningButton messageId={m.id} senderName={m.sender.name} />
                ) : null}
                <AdminActionButton
                  action="delete_message"
                  id={m.id}
                  label="Delete message"
                  confirm="Delete this message?"
                  danger
                />
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
