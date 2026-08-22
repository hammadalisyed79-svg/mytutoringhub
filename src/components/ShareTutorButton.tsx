"use client";

import { useState } from "react";

export function ShareTutorButton({
  tutorId,
  tutorName,
}: {
  tutorId: string;
  tutorName: string;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/tutors/${tutorId}`
      : `/tutors/${tutorId}`;

  async function share() {
    const shareUrl = `${window.location.origin}/tutors/${tutorId}`;
    const title = `${tutorName} on My Tutoring Hub`;
    const text = `Check out ${tutorName} for private tutoring on My Tutoring Hub.`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  return (
    <button type="button" className="btn btn-secondary btn-sm share-tutor-btn" onClick={share}>
      {copied ? "Link copied" : "Share profile"}
    </button>
  );
}
