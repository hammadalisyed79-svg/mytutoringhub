"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AiChatPanel } from "@/components/AiChatPanel";
import { AI_SUPPORT_WELCOME } from "@/lib/ai-support";

export function AiSupportWidget({ configured }: { configured: boolean }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <div className="ai-support-widget">
        <Link href="/help" className="ai-support-launcher" aria-label="Help and FAQ">
          <span aria-hidden>?</span>
          <span className="ai-support-launcher-label">Help</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`ai-support-widget${open ? " is-open" : ""}`}>
      {open ? (
        <div className="ai-support-panel" role="dialog" aria-label="AI support chat">
          <header className="ai-support-panel-head">
            <div>
              <strong>Support assistant</strong>
              <p className="muted ai-support-panel-sub">Instant help with plans, messaging &amp; account</p>
            </div>
            <button
              type="button"
              className="ai-support-close"
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
            >
              ×
            </button>
          </header>
          <AiChatPanel
            apiPath="/api/ai/support"
            initiallyConfigured={configured}
            assistantLabel="Support"
            emptyHint={AI_SUPPORT_WELCOME}
            placeholder="Ask about plans, verification, messaging…"
            compact
            unconfiguredMessage="AI support is unavailable. Email admin@mytutoringhub.com or visit Help."
          />
          <p className="muted ai-support-panel-foot">
            <Link href="/support" onClick={() => setOpen(false)}>
              Open full page
            </Link>
            {" · "}
            <Link href="/contact" onClick={() => setOpen(false)}>
              Contact billing
            </Link>
          </p>
        </div>
      ) : null}
      <button
        type="button"
        className="ai-support-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close support chat" : "Open AI support chat"}
      >
        <span aria-hidden>?</span>
        <span className="ai-support-launcher-label">{open ? "Close" : "Support"}</span>
      </button>
    </div>
  );
}
