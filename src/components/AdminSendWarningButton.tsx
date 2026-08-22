"use client";

import { useState } from "react";
import { AdminActionButton } from "@/components/AdminActions";

export function AdminSendWarningButton({
  messageId,
  senderName,
}: {
  messageId: string;
  senderName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    const custom = window.prompt(
      `Optional extra note for ${senderName}'s warning email (leave blank for default):`,
    );
    if (custom === null) return;
    if (!window.confirm(`Send a community guidelines warning email to ${senderName}?`)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "warn_message_sender",
          messageId,
          adminNote: custom.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Could not send warning");
      }
      window.alert("Warning email sent.");
      window.location.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not send warning");
      setBusy(false);
    }
  }

  return (
    <button className="link-btn admin-warn-btn" type="button" disabled={busy} onClick={run}>
      {busy ? "Sending…" : "Send warning"}
    </button>
  );
}

export function AdminWarnAllButton({
  conversationId,
  count,
}: {
  conversationId: string;
  count: number;
}) {
  if (count < 1) return null;

  return (
    <AdminActionButton
      action="warn_conversation_offenders"
      id={conversationId}
      extra={{ conversationId }}
      label={`Warn flagged senders (${count})`}
      confirm={`Email a guidelines warning to each sender of flagged messages in this thread?`}
    />
  );
}
