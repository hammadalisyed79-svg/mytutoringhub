import Link from "next/link";

type Props = {
  href: string;
  variant?: "empty" | "thin";
  subjectHint?: string;
};

/** Demand capture when search supply is empty or thin. */
export function SearchDemandCta({ href, variant = "empty", subjectHint }: Props) {
  const empty = variant === "empty";
  return (
    <div className={`panel search-demand-cta${empty ? " search-demand-cta--empty" : ""}`}>
      <h2 style={{ marginTop: 0, fontSize: empty ? "1.25rem" : "1.1rem" }}>
        {empty
          ? subjectHint
            ? `No ${subjectHint} tutors listed yet`
            : "We couldn’t find the right tutor yet"
          : "Few tutors match right now"}
      </h2>
      <p className="muted">
        {empty
          ? "Post your requirement with these filters pre-filled — matching tutors can message you. Or browse online tutors while supply grows."
          : "Post what you need so more tutors can reach you, or broaden to online / nearby cities."}
      </p>
      <p className="hero-ctas" style={{ flexWrap: "wrap", marginBottom: 0 }}>
        <Link href={href} className="btn">
          Post a request
        </Link>
        <Link href="/search?mode=online" className="btn btn-secondary">
          Browse online tutors
        </Link>
        <Link href="/pricing?plan=STUDENT_PASS" className="btn btn-secondary">
          Student Pass
        </Link>
      </p>
    </div>
  );
}
