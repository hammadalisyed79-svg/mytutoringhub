import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";
import { AdminModerationBadge } from "@/components/AdminMessageModeration";
import {
  conversationModerationSummary,
  scanMessages,
} from "@/lib/message-moderation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; flagged?: string }>;

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const flaggedOnly = sp.flagged === "1";

  const conversations = await prisma.conversation.findMany({
    where: q
      ? {
          OR: [
            { userA: { email: { contains: q, mode: "insensitive" } } },
            { userB: { email: { contains: q, mode: "insensitive" } } },
            { userA: { name: { contains: q, mode: "insensitive" } } },
            { userB: { name: { contains: q, mode: "insensitive" } } },
            { id: q },
          ],
        }
      : {},
    orderBy: { lastMessageAt: "desc" },
    take: 80,
    include: {
      userA: { select: { id: true, name: true, email: true } },
      userB: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 40 },
      _count: { select: { messages: true } },
    },
  });

  const enriched = conversations.map((conversation) => {
    const scans = scanMessages(conversation.messages);
    const summary = conversationModerationSummary(scans.values());
    const latestFlagged = conversation.messages.find((m) => scans.get(m.id)?.flagged);
    return { conversation, summary, latestFlagged, scans };
  });

  const flaggedCount = enriched.filter((row) => row.summary.flagged).length;
  const visible = flaggedOnly ? enriched.filter((row) => row.summary.flagged) : enriched;
  visible.sort((a, b) => {
    if (a.summary.flagged !== b.summary.flagged) return a.summary.flagged ? -1 : 1;
    if (a.summary.score !== b.summary.score) return b.summary.score - a.summary.score;
    return b.conversation.lastMessageAt.getTime() - a.conversation.lastMessageAt.getTime();
  });

  return (
    <>
      <div>
        <h1 className="page-title">Messaging moderation</h1>
        <p className="muted">
          Search conversations, review auto-flagged scam or abusive messages, send warnings, or remove
          content.
        </p>
      </div>

      {flaggedCount > 0 && (
        <div className="admin-mod-alert">
          <strong>{flaggedCount}</strong> conversation{flaggedCount === 1 ? "" : "s"} flagged by
          auto-detection. Review highlighted threads below.
        </div>
      )}

      <form className="filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={q} placeholder="Name, email, or conversation id" />
        </label>
        <label className="radio admin-mod-filter">
          <input name="flagged" type="checkbox" value="1" defaultChecked={flaggedOnly} />
          Flagged only
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {visible.length === 0 && (
        <p className="muted">
          {flaggedOnly ? "No flagged conversations match this search." : "No conversations match."}
        </p>
      )}

      <div className="results">
        {visible.map(({ conversation: c, summary, latestFlagged, scans }) => {
          const latest = c.messages[0];
          const latestScan = latest ? scans.get(latest.id) : null;
          return (
            <article
              key={c.id}
              className={`ad-row admin-mod-row${summary.flagged ? " is-flagged" : ""}`}
            >
              <div className="admin-mod-row-head">
                <strong>
                  {c.userA.name} ↔ {c.userB.name}
                </strong>
                <AdminModerationBadge result={summary} compact />
              </div>
              <span className="muted">
                {c.userA.email} · {c.userB.email} · {c._count.messages} messages
              </span>
              {latestFlagged ? (
                <p className="admin-mod-preview">
                  <span className="admin-mod-preview-label">Flagged excerpt:</span>{" "}
                  {latestFlagged.body.slice(0, 180)}
                </p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  {(latest?.body || "No messages").slice(0, 160)}
                </p>
              )}
              {latestScan?.flagged ? (
                <p className="muted admin-mod-latest">
                  Latest message also flagged: {latestScan.flags[0]?.label}
                </p>
              ) : null}
              <div className="admin-actions">
                <Link href={`/admin/messages/${c.id}`}>Open thread</Link>
                {summary.flagged ? (
                  <Link href={`/admin/messages/${c.id}#flagged`}>Review flags</Link>
                ) : null}
                <AdminActionButton
                  action="delete_conversation"
                  id={c.id}
                  label="Delete conversation"
                  confirm="Delete this entire conversation and all messages?"
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
