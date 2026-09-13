"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AiChatPanel } from "@/components/AiChatPanel";
import { AI_SUPPORT_PLACEHOLDER, AI_SUPPORT_WELCOME } from "@/lib/ai-support";

type Props = {
  configured: boolean;
  /** When true, show Help link only (site setting disableAiAssistant). */
  aiDisabled?: boolean;
};

export function AiSupportWidget({ configured, aiDisabled = false }: Props) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;
  const chatBlocked = aiDisabled && role !== "ADMIN";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (status === "loading") return null;

  if (status !== "authenticated" || chatBlocked) {
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
        <div className="ai-support-panel" role="dialog" aria-label="Support chat">
          <header className="ai-support-panel-head">
            <div>
              <strong>Support</strong>
              <p className="muted ai-support-panel-sub">
                Plans, messaging, Teaching Profiles, papers &amp; billing
              </p>
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
            placeholder={AI_SUPPORT_PLACEHOLDER}
            compact
            unconfiguredMessage="AI support is unavailable. Email admin@mytutoringhub.com or visit Help."
          />
          <p className="muted ai-support-panel-foot">
            <Link href="/support" onClick={() => setOpen(false)}>
              Open full page
            </Link>
            {" · "}
            <Link href="/help" onClick={() => setOpen(false)}>
              Help &amp; FAQ
            </Link>
            {" · "}
            <Link href="/contact" onClick={() => setOpen(false)}>
              Contact
            </Link>
          </p>
        </div>
      ) : null}
      <button
        type="button"
        className="ai-support-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        <span aria-hidden>?</span>
        <span className="ai-support-launcher-label">{open ? "Close" : "Support"}</span>
      </button>
    </div>
  );
}
