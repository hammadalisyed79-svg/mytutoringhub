import Link from "next/link";
import { slugify } from "@/lib/search-tutors";

export function PastPaperTutorCta({ subject }: { subject: string }) {
  const label = subject.trim();
  if (!label) return null;

  return (
    <aside className="panel paper-tutor-cta">
      <h2>Need help with {label}?</h2>
      <p className="muted">
        Find a private tutor for {label} — search free, message with Student Pass, and arrange
        lessons directly. No commission on lesson fees.
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
      </div>
    </aside>
  );
}
