import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StartMessageFromQuery } from "@/components/StartMessageFromQuery";

export const metadata = { title: "Messages" };

type SearchParams = Promise<{ to?: string; ad?: string }>;

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;

  const uid = session.user.id;
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: uid }, { userBId: uid }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Messages</h1>
        <p className="section-lead">Chat with tutors and students after you both have active plans.</p>

        {sp.to && <StartMessageFromQuery recipientId={sp.to} relatedAdId={sp.ad} />}

        <div className="results">
          {conversations.length === 0 && <p className="muted">No conversations yet.</p>}
          {conversations.map((c) => {
            const other = c.userAId === uid ? c.userB : c.userA;
            const preview = c.messages[0]?.body || "No messages";
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="ad-row">
                <strong>{other.name}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {preview.slice(0, 120)}
                </p>
                <span className="muted">{c.lastMessageAt.toLocaleString()}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
