import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();

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
    take: 60,
    include: {
      userA: { select: { id: true, name: true, email: true } },
      userB: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });

  return (
    <>
      <div>
        <h1 className="page-title">Messaging moderation</h1>
        <p className="muted">Search conversations, read threads, and remove abusive messages.</p>
      </div>

      <form className="filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={q} placeholder="Name, email, or conversation id" />
        </label>
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {conversations.length === 0 && <p className="muted">No conversations match.</p>}

      <div className="results">
        {conversations.map((c) => (
          <article key={c.id} className="ad-row">
            <strong>
              {c.userA.name} ↔ {c.userB.name}
            </strong>
            <span className="muted">
              {c.userA.email} · {c.userB.email} · {c._count.messages} messages
            </span>
            <p className="muted" style={{ margin: 0 }}>
              {(c.messages[0]?.body || "No messages").slice(0, 160)}
            </p>
            <div className="admin-actions">
              <Link href={`/admin/messages/${c.id}`}>Open thread</Link>
              <AdminActionButton
                action="delete_conversation"
                id={c.id}
                label="Delete conversation"
                confirm="Delete this entire conversation and all messages?"
                danger
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
