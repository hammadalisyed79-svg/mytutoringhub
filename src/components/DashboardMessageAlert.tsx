import Link from "next/link";
import { getUnreadMessageSummary } from "@/lib/message-inbox";

export async function DashboardMessageAlert({ userId }: { userId: string }) {
  const { unread, latest } = await getUnreadMessageSummary(userId);
  if (unread === 0) return null;

  const preview = latest?.body?.trim()
    ? latest.body.slice(0, 120)
    : latest
      ? "Sent a photo"
      : "";

  return (
    <div
      className="panel"
      style={{
        marginTop: "1rem",
        borderColor: "var(--brand)",
        background: "rgba(15, 90, 70, 0.06)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {unread} unread message{unread === 1 ? "" : "s"}
      </h2>
      {latest && (
        <p className="muted" style={{ marginTop: 0 }}>
          Latest from <strong>{latest.sender.name}</strong>
          {preview ? `: “${preview}${(latest.body?.length ?? 0) > 120 ? "…" : ""}”` : "."}
        </p>
      )}
      <p style={{ marginBottom: 0 }}>
        <Link href={latest ? `/messages/${latest.conversationId}` : "/messages"} className="btn btn-sm">
          Open inbox
        </Link>
      </p>
    </div>
  );
}
