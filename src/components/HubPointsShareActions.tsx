"use client";

import { useState } from "react";

export function HubPointsShareActions({
  referralLink,
  role,
}: {
  referralLink: string;
  role: "STUDENT" | "TUTOR";
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your referral link:", referralLink);
    }
  }

  const whatsAppHref = `https://wa.me/?text=${encodeURIComponent(
    role === "TUTOR"
      ? `Join me on My Tutoring Hub — free tutor listing, earn Hub Points when you complete your profile.\n\n${referralLink}`
      : `Find tutors on My Tutoring Hub — I'll earn Hub Points when you join and message a tutor.\n\n${referralLink}`,
  )}`;

  return (
    <div className="points-share-block">
      <p className="points-share-lead">
        <strong>Your referral link</strong> — share to start earning
      </p>
      <div className="points-share-url" title={referralLink}>
        {referralLink.replace(/^https?:\/\//, "")}
      </div>
      <div className="points-share-actions">
        <button
          type="button"
          className={`btn btn-sm ${copied ? "points-share-copied" : ""}`}
          onClick={copyLink}
        >
          {copied ? "✓ Copied!" : "Copy link"}
        </button>
        <a
          href={whatsAppHref}
          className="btn btn-secondary btn-sm points-share-whatsapp"
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
