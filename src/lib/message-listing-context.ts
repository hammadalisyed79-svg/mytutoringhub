/**
 * Teaching Profile context inside a student–tutor conversation.
 * Conversations stay unique on (userAId, userBId). This is display/prefill only.
 */

import { listingPath } from "@/lib/subject-profile";
import { joinCapabilityLabels } from "@/lib/teaching-profile-capabilities";
import { teachingProfileEditorValues } from "@/lib/teaching-profile-dashboard";

export const TEACHING_PROFILE_CONTEXT_MARKER = "[[mth-tp]]";
const REGARDING_PREFIX = "Regarding:";

export type TeachingProfileThreadContext = {
  listingId: string;
  subject: string;
  title: string;
  line: string;
  href: string;
  rate: number;
};

export type ListingContextInput = {
  id: string;
  subject: string;
  title?: string | null;
  rate?: number | null;
  level?: string | null;
  board?: string | null;
  qualification?: string | null;
  syllabusCode?: string | null;
  capabilities?: { kind: string; value: string }[] | null;
};

export function teachingProfileContextLine(listing: ListingContextInput): string {
  const editor = teachingProfileEditorValues(listing);
  const parts = [
    listing.subject,
    joinCapabilityLabels(editor.boards),
    joinCapabilityLabels(editor.qualifications.length ? editor.qualifications : editor.levels),
    joinCapabilityLabels(editor.syllabusCodes),
    Number.isFinite(Number(listing.rate)) && Number(listing.rate) > 0
      ? `${Math.round(Number(listing.rate))} PKR/hr`
      : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export function teachingProfileThreadContext(listing: ListingContextInput): TeachingProfileThreadContext {
  const line = teachingProfileContextLine(listing);
  return {
    listingId: listing.id,
    subject: listing.subject,
    title: (listing.title || "").trim() || listing.subject,
    line,
    href: listingPath(listing.id),
    rate: Number(listing.rate) || 0,
  };
}

export function encodeTeachingProfileContextMessage(ctx: TeachingProfileThreadContext): string {
  return `${TEACHING_PROFILE_CONTEXT_MARKER}${JSON.stringify({
    listingId: ctx.listingId,
    subject: ctx.subject,
    title: ctx.title,
    line: ctx.line,
    href: ctx.href,
    rate: ctx.rate,
  })}`;
}

export function parseTeachingProfileContextMessage(body: string): TeachingProfileThreadContext | null {
  const raw = (body || "").trim();
  if (!raw.startsWith(TEACHING_PROFILE_CONTEXT_MARKER)) return null;
  try {
    const parsed = JSON.parse(raw.slice(TEACHING_PROFILE_CONTEXT_MARKER.length)) as TeachingProfileThreadContext;
    if (!parsed?.listingId || !parsed.line) return null;
    return {
      listingId: parsed.listingId,
      subject: parsed.subject || "",
      title: parsed.title || parsed.subject || "",
      line: parsed.line,
      href: parsed.href || listingPath(parsed.listingId),
      rate: Number(parsed.rate) || 0,
    };
  } catch {
    return null;
  }
}

export function withRegardingPreface(body: string, ctx: TeachingProfileThreadContext): string {
  const trimmed = body.trim();
  if (!trimmed) return `${REGARDING_PREFIX} ${ctx.line}`;
  if (trimmed.startsWith(REGARDING_PREFIX) || trimmed.startsWith(TEACHING_PROFILE_CONTEXT_MARKER)) {
    return trimmed;
  }
  return `${REGARDING_PREFIX} ${ctx.line}\n\n${trimmed}`;
}

export function lastContextListingId(messages: { body?: string | null }[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const parsed = parseTeachingProfileContextMessage(messages[i]?.body || "");
    if (parsed?.listingId) return parsed.listingId;
  }
  return null;
}
