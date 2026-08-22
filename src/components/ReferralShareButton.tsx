"use client";

import { useState } from "react";
import { REFERRAL_LINE } from "@/lib/marketing-copy";

export function ReferralShareButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const link = `${window.location.origin}/register?role=student&ref=${encodeURIComponent(userId)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your referral link:", link);
    }
  }

  return (
    <div className="referral-share panel">
      <h3>Invite a friend</h3>
      <p className="muted">{REFERRAL_LINE}</p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
        {copied ? "Link copied" : "Copy referral link"}
      </button>
    </div>
  );
}
