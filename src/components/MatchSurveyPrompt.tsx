"use client";

import { useEffect, useState } from "react";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import { matchSurveyEventName, matchSurveyQuestion } from "@/lib/match-survey";

/** Soft match-proxy prompt after meaningful two-way chat. */
export function MatchSurveyPrompt({
  conversationId,
  viewerRole,
}: {
  conversationId: string;
  viewerRole?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/messages/${conversationId}/match-feedback`);
        const data = (await res.json().catch(() => ({}))) as {
          eligible?: boolean;
          answered?: boolean;
        };
        if (!cancelled && data.eligible && !data.answered) setVisible(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (!visible || done) return null;

  const question = matchSurveyQuestion(viewerRole || "STUDENT");

  async function submit(answer: "YES" | "NO" | "SKIP") {
    setBusy(true);
    try {
      const res = await fetch(`/api/messages/${conversationId}/match-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        gaEvent?: string;
        answer?: string;
      };
      if (res.ok && answer !== "SKIP") {
        const event =
          (data.gaEvent as
            | "successful_match_student_response"
            | "successful_match_tutor_response"
            | undefined) || matchSurveyEventName(viewerRole || "STUDENT");
        fireConversionEvent(event, { answer }, `match_${conversationId}`);
      }
      setDone(true);
      setVisible(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="panel"
      style={{ margin: "0 0 1rem", padding: "0.85rem 1rem", fontSize: "0.92rem" }}
      role="group"
      aria-label="Match feedback"
    >
      <p style={{ margin: "0 0 0.65rem" }}>{question}</p>
      <p style={{ margin: 0, display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="btn btn-sm" type="button" disabled={busy} onClick={() => submit("YES")}>
          Yes
        </button>
        <button
          className="btn btn-sm btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => submit("NO")}
        >
          Not yet
        </button>
        <button
          className="link-btn"
          type="button"
          disabled={busy}
          onClick={() => submit("SKIP")}
          style={{ fontSize: "0.85rem" }}
        >
          Dismiss
        </button>
      </p>
    </div>
  );
}
