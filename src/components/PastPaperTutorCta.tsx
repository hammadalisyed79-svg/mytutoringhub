import Link from "next/link";
import { findTutorCtaCopy, NO_LESSON_COMMISSION_SHORT } from "@/lib/business-rules";
import { slugify } from "@/lib/search-tutors";

export function PastPaperTutorCta({ subject }: { subject: string }) {
  const label = subject.trim();
  if (!label) return null;

  return (
    <aside className="panel paper-tutor-cta">
      <h2>Need help with {label}?</h2>
      <p className="muted">
        {findTutorCtaCopy(label)} {NO_LESSON_COMMISSION_SHORT}.
      </p>
      <div className="hero-ctas">
        <Link href={`/search?subject=${encodeURIComponent(label)}`} className="btn btn-sm">
          Find {label} tutors
        </Link>
        <Link href={`/s/${slugify(label)}`} className="btn btn-secondary btn-sm">
          Browse by location
        </Link>
        <Link href="/ads/new" className="btn btn-secondary btn-sm">
          Post a request
        </Link>
        <Link href="/assistant" className="btn btn-secondary btn-sm">
          Study assistant
        </Link>
      </div>
    </aside>
  );
}
