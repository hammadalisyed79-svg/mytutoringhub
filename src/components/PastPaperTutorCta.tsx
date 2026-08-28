import Link from "next/link";
import { findTutorCtaCopy, NO_LESSON_COMMISSION_SHORT } from "@/lib/business-rules";
import { slugify } from "@/lib/search-tutors";

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

  const search = new URLSearchParams();
  search.set("subject", label);
  if (board) search.set("board", board);
  if (level) search.set("level", level);
  if (syllabusCode) search.set("q", syllabusCode);

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
        <Link href={`/search?${search.toString()}`} className="btn btn-sm">
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
