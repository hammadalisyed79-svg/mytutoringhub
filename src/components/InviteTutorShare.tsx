"use client";

import { useMemo, useState } from "react";
import {
  tutorInviteMessage,
  tutorInvitePath,
  tutorInviteUrl,
  tutorInviteWhatsAppHref,
} from "@/lib/referral-links";
import { TUTOR_INVITE_LINE } from "@/lib/marketing-copy";
import { linkedInShareHref } from "@/lib/site-social";

type Props = {
  referrerId?: string | null;
  referrerName?: string | null;
  compact?: boolean;
  id?: string;
};

export function InviteTutorShare({
  referrerId,
  referrerName,
  compact = false,
  id = "invite-tutor",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = tutorInvitePath(referrerId);
  const link = origin ? tutorInviteUrl(origin, referrerId) : path;
  const message = useMemo(
    () => tutorInviteMessage(link, referrerName),
    [link, referrerName],
  );
  const whatsAppHref = tutorInviteWhatsAppHref(link, referrerName);
  const linkedInHref = linkedInShareHref(link);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy your tutor invite link:", link);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      window.prompt("Copy this message:", message);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Become a tutor on My Tutoring Hub",
        text: message,
        url: link,
      });
    } catch {
      // cancelled
    }
  }

  return (
    <section className={`invite-tutor-share panel${compact ? " invite-tutor-share-compact" : ""}`} id={id}>
      <h2>{compact ? "Invite a tutor" : "Invite tutors worldwide"}</h2>
      <p className="muted">{TUTOR_INVITE_LINE}</p>
      {!referrerId && (
        <p className="muted invite-tutor-share-note">
          This is a general invite link. Log in to get a personal link we can attribute to you.
        </p>
      )}
      <div className="invite-tutor-share-link">
        <code>{path}</code>
      </div>
      <div className="invite-tutor-share-actions">
        <button type="button" className="btn btn-sm" onClick={copyLink}>
          {copied ? "Link copied" : "Copy link"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copyMessage}>
          {copiedMessage ? "Message copied" : "Copy message"}
        </button>
        <a
          className="btn btn-secondary btn-sm"
          href={whatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        <a
          className="btn btn-secondary btn-sm"
          href={linkedInHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on LinkedIn
        </a>
        <button type="button" className="btn btn-secondary btn-sm" onClick={nativeShare}>
          Share…
        </button>
      </div>
    </section>
  );
}
