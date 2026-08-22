import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StartMessageFromQuery } from "@/components/StartMessageFromQuery";
import { MessagesPlanPanel } from "@/components/MessagesPlanPanel";
import { isImageAttachment } from "@/lib/media";
import { VALUE_PROPOSITION } from "@/lib/marketing-copy";

export const metadata = { title: "Messages" };

type SearchParams = Promise<{ to?: string; ad?: string }>;

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;

  const uid = session.user.id;
  if (session.user.role !== "ADMIN") {
    const me = await prisma.user.findUnique({
      where: { id: uid },
      select: { emailVerified: true, suspended: true },
    });
    if (me?.suspended) redirect("/dashboard");
    if (!me?.emailVerified) redirect("/dashboard?verify=1");
  }
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: uid }, { userBId: uid }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: uid } } },
        },
      },
    },
  });

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Messages</h1>
        <p className="section-lead">{VALUE_PROPOSITION}</p>

        <MessagesPlanPanel userId={uid} role={session.user.role} />

        {sp.to && <StartMessageFromQuery recipientId={sp.to} relatedAdId={sp.ad} />}

        {conversations.length === 0 && !sp.to && (
          <div className="panel empty-state">
            <h2>No conversations yet</h2>
            <p className="muted">
              {session.user.role === "TUTOR"
                ? "Browse student requests and reply. Tutor Basic unlocks unlimited enquiry reveals when you message first."
                : "Search tutors and send a message. Use your free monthly contacts or upgrade above for unlimited messaging."}
            </p>
            <p>
              {session.user.role === "TUTOR" ? (
                <Link href="/ads" className="btn">
                  Browse student requests
                </Link>
              ) : (
                <Link href="/search" className="btn">
                  Find tutors
                </Link>
              )}
            </p>
          </div>
        )}

        <div className="results">
          {conversations.map((c) => {
            const other = c.userAId === uid ? c.userB : c.userA;
            const last = c.messages[0];
            const unread = c._count.messages;
            const preview = last?.body?.trim()
              ? last.body
              : last?.attachmentUrl
                ? "Photo"
                : "No messages";
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className={`ad-row conv-row ${unread ? "unread" : ""}`}
              >
                {last?.attachmentUrl && isImageAttachment(last.attachmentUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="msg-preview-thumb" src={last.attachmentUrl} alt="" />
                )}
                <div className="conv-row-body">
                  <strong>
                    {other.name}
                    {unread > 0 && (
                      <span className="nav-badge" aria-label={`${unread} unread`}>
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </strong>
                  <p className="muted" style={{ margin: 0 }}>
                    {preview.slice(0, 120)}
                  </p>
                  <span className="muted">{c.lastMessageAt.toLocaleString()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
