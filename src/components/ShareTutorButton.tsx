"use client";

import { useState } from "react";

export function ShareTutorButton({
  tutorId,
  tutorName,
  path,
}: {
  tutorId: string;
  tutorName: string;
  /** Override share path (e.g. `/listings/[id]`). Defaults to `/tutors/[id]`. */
  path?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const shareUrl = `${window.location.origin}${path || `/tutors/${tutorId}`}`;
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
