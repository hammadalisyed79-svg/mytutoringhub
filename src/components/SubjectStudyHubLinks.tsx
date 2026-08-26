import Link from "next/link";
import { slugify } from "@/lib/search-tutors";

type Props = {
  subject: string;
  /** Optional count shown next to past-papers link */
  pastPaperCount?: number;
  compact?: boolean;
};

export function SubjectStudyHubLinks({ subject, pastPaperCount, compact }: Props) {
  const label = subject.trim();
  if (!label) return null;

  const hubHref = `/s/${slugify(label)}`;
  const searchHref = `/search?subject=${encodeURIComponent(label)}`;
  const papersHref = `/past-papers?subject=${encodeURIComponent(label)}`;

  if (compact) {
    return (
      <p className="subject-study-hub-links compact">
        <Link href={hubHref}>{label} tutors</Link>
        {" · "}
        <Link href={searchHref}>Search</Link>
        {" · "}
        <Link href={papersHref}>
          Past papers{pastPaperCount != null && pastPaperCount > 0 ? ` (${pastPaperCount})` : ""}
        </Link>
      </p>
    );
  }

  return (
    <aside className="panel subject-study-hub-links">
      <h2>Study {label} on My Tutoring Hub</h2>
      <p className="muted">
        Browse tutors, past papers, and student requests — lesson fees stay between you and the tutor.
      </p>
      <div className="hero-ctas">
        <Link href={hubHref} className="btn btn-sm">
          {label} tutors
        </Link>
        <Link href={searchHref} className="btn btn-secondary btn-sm">
          Advanced search
        </Link>
        <Link href={papersHref} className="btn btn-secondary btn-sm">
          Past papers{pastPaperCount != null && pastPaperCount > 0 ? ` (${pastPaperCount})` : ""}
        </Link>
        <Link href="/ads" className="btn btn-secondary btn-sm">
          Student requests
        </Link>
      </div>
    </aside>
  );
}
