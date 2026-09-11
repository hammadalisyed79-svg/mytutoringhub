import Link from "next/link";

/** Compact Student Pass / Pro past-paper entitlement meter. */
export function PastPaperQuotaBanner({
  used,
  limit,
  includedInPlan,
}: {
  used: number;
  limit: number;
  includedInPlan: boolean;
}) {
  if (!includedInPlan) {
    return (
      <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.92rem" }}>
        Free accounts browse papers here. Download with{" "}
        <Link href="/pricing?plan=STUDENT_PASS">Student Pass</Link> (10/month),{" "}
        <Link href="/pricing?plan=STUDENT_PRO">Student Pro</Link> (unlimited eligible), or pay per
        paper.
      </p>
    );
  }
  if (limit < 0) {
    return (
      <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.92rem" }}>
        Unlimited eligible past paper downloads with Student Pro.
      </p>
    );
  }
  const remaining = Math.max(0, limit - used);
  if (remaining <= 0) {
    return (
      <p
        className="panel"
        style={{ margin: "0 0 1rem", padding: "0.75rem 1rem", fontSize: "0.92rem" }}
      >
        You&apos;ve used all {limit} included downloads this month.{" "}
        <Link href="/pricing?plan=STUDENT_PRO">Upgrade to Student Pro</Link> for unlimited eligible
        downloads, or buy individual papers below.
      </p>
    );
  }
  return (
    <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.92rem" }}>
      {remaining} of {limit} eligible downloads remaining this month
      {remaining <= 2 ? (
        <>
          {" "}
          · <Link href="/pricing?plan=STUDENT_PRO">Student Pro</Link> unlocks unlimited eligible
          papers
        </>
      ) : null}
      .
    </p>
  );
}
