"use client";

import Link from "next/link";
import { findTutorCtaCopy, NO_LESSON_COMMISSION_SHORT } from "@/lib/business-rules";
import { slugify } from "@/lib/search-tutors";
import { pastPaperTutorSearchHref } from "@/lib/past-paper-tutor-search";

export function PastPaperTutorCta({
  subject,
  board,
  level,
  syllabusCode,
}: {
  subject: string;
  board?: string | null;
  level?: string | null;
  syllabusCode?: string | null;
}) {
  const label = subject.trim();
  if (!label) return null;

  const searchHref = pastPaperTutorSearchHref({ subject: label, board, level, syllabusCode });

  const request = new URLSearchParams();
  request.set("subject", label);
  if (level) request.set("level", level);
  if (board) request.set("board", board);
  if (syllabusCode) request.set("syllabusCode", syllabusCode);

  const taxonomy = [board, level, syllabusCode].filter(Boolean).join(" · ");

  return (
    <aside className="panel paper-tutor-cta">
      <h2>Need help with {label}{syllabusCode ? ` ${syllabusCode}` : ""}?</h2>
      <p className="muted">
        {findTutorCtaCopy(label)}
        {taxonomy ? ` Matched for ${taxonomy}.` : ""} {NO_LESSON_COMMISSION_SHORT}.
      </p>
      <div className="hero-ctas">
        <Link href={searchHref} className="btn btn-sm">
          Find matching tutors
        </Link>
        <Link href={`/s/${slugify(label)}`} className="btn btn-secondary btn-sm">
          Browse by location
        </Link>
        <Link href={`/ads/new?${request.toString()}`} className="btn btn-secondary btn-sm">
          Post a request
        </Link>
        <Link href="/assistant" className="btn btn-secondary btn-sm">
          Study assistant
        </Link>
      </div>
    </aside>
  );
}
