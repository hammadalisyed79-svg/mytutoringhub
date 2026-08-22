import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StartMessageFromQuery } from "@/components/StartMessageFromQuery";
import { MessagesPlanPanel } from "@/components/MessagesPlanPanel";
import { isImageAttachment } from "@/lib/media";
import { VALUE_PROPOSITION } from "@/lib/marketing-copy";
import { getPlanDashboardSummary } from "@/lib/plan-limits";
import { resolveMessageRecipient } from "@/lib/message-recipient";

export const metadata = { title: "Messages" };

type SearchParams = Promise<{ to?: string; tutor?: string; ad?: string }>;

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;
  const rawRecipient = sp.to?.trim() || sp.tutor?.trim();

  const uid = session.user.id;
  if (session.user.role !== "ADMIN") {
    const me = await prisma.user.findUnique({
      where: { id: uid },
      select: { emailVerified: true, suspended: true },
    });
    if (me?.suspended) redirect("/dashboard");
    if (!me?.emailVerified) redirect("/dashboard?verify=1");
  }

  const recipient = rawRecipient ? await resolveMessageRecipient(rawRecipient) : null;
  const recipientId = recipient?.userId;

  if (recipientId && recipientId !== uid) {
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: uid, userBId: recipientId },
          { userAId: recipientId, userBId: uid },
        ],
      },
      select: { id: true },
    });
    if (existing) redirect(`/messages/${existing.id}`);
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

  const studentPlanSummary =
    session.user.role === "STUDENT" ? await getPlanDashboardSummary(uid, "STUDENT") : null;

  const hasUnlimited = Boolean(studentPlanSummary && studentPlanSummary.usageLimit < 0);
  const contactsLimit =
    studentPlanSummary && studentPlanSummary.usageLimit > 0
      ? studentPlanSummary.usageLimit
      : null;
  const contactsRemaining =
    studentPlanSummary && studentPlanSummary.usageLimit > 0
      ? Math.max(0, studentPlanSummary.usageLimit - studentPlanSummary.usageUsed)
      : hasUnlimited
        ? null
        : null;

  const composing = Boolean(recipientId && recipientId !== uid);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Messages</h1>
        <p className="section-lead">{VALUE_PROPOSITION}</p>

        {/* Compose first — messaging is the job of this page when a tutor is selected */}
        {composing && recipientId && (
          <StartMessageFromQuery
            recipientId={recipientId}
            recipientName={recipient?.name}
            relatedAdId={sp.ad}
            contactsRemaining={contactsRemaining}
            contactsLimit={contactsLimit}
            hasUnlimited={hasUnlimited || session.user.role !== "STUDENT"}
          />
        )}

        {rawRecipient && !recipientId && (
          <div className="panel empty-state" style={{ marginBottom: "1.5rem" }}>
            <h2>Tutor not found</h2>
            <p className="muted">That tutor link is invalid or no longer available.</p>
            <p>
              <Link href="/search" className="btn">
                Find tutors
              </Link>
            </p>
          </div>
        )}

        <MessagesPlanPanel
          userId={uid}
          role={session.user.role}
          composing={composing}
        />

        {conversations.length === 0 && !composing && (
          <div className="panel empty-state">
            <h2>No conversations yet</h2>
            <p className="muted">
              {session.user.role === "TUTOR"
                ? "Browse student requests and reply. Tutor Basic unlocks unlimited enquiry reveals when you message first."
                : hasUnlimited
                  ? "Search tutors and send a message — your plan includes unlimited tutor contacts this month."
                  : studentPlanSummary && contactsRemaining != null && contactsLimit != null
                    ? `Search tutors and send a message. You have ${contactsRemaining} of ${contactsLimit} free tutor contacts left this month.`
                    : "Search tutors and send a message. Free accounts get 3 new tutor contacts per month."}
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
