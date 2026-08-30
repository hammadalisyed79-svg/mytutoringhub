import Link from "next/link";
import {
  ALWAYS_FREE_HIGHLIGHTS,
  FREE_VS_PAID_FAQS,
  FREE_VS_PAID_INTRO,
  STUDENT_COMPARE_ROWS,
  STUDENT_PAID_HIGHLIGHTS,
  TUTOR_COMPARE_ROWS,
  TUTOR_PAID_HIGHLIGHTS,
  type CompareCell,
} from "@/lib/free-vs-paid";

function formatCell(value: CompareCell) {
  if (value === "yes") return <span className="compare-yes">Included</span>;
  if (value === "no") return <span className="compare-muted">—</span>;
  if (value === "limited") return <span className="compare-limited">Limited</span>;
  return <span>{value}</span>;
}

function CompareTable({
  caption,
  freeLabel,
  paidLabel,
  rows,
}: {
  caption: string;
  freeLabel: string;
  paidLabel: string;
  rows: typeof STUDENT_COMPARE_ROWS;
}) {
  return (
    <div className="compare-table-wrap">
      <table className="compare-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">{freeLabel}</th>
            <th scope="col">{paidLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature}>
              <th scope="row">
                {row.feature}
                {row.detail ? <span className="compare-detail">{row.detail}</span> : null}
              </th>
              <td>{formatCell(row.free)}</td>
              <td>{formatCell(row.paid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FreeVsPaidHighlights({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`free-vs-paid-highlights${compact ? " is-compact" : ""}`}>
      <div className="panel free-vs-paid-card">
        <p className="eyebrow">Always free</p>
        <ul className="check-list">
          {ALWAYS_FREE_HIGHLIGHTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="panel free-vs-paid-card">
        <p className="eyebrow">Students — paid plans</p>
        <ul className="check-list">
          {STUDENT_PAID_HIGHLIGHTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="panel free-vs-paid-card">
        <p className="eyebrow">Tutors — paid plans</p>
        <ul className="check-list">
          {TUTOR_PAID_HIGHLIGHTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function FreeVsPaidComparison({ showFaq = true }: { showFaq?: boolean }) {
  return (
    <>
      <p className="section-lead">{FREE_VS_PAID_INTRO}</p>

      <FreeVsPaidHighlights />

      <section className="compare-section">
        <h2>For students & parents</h2>
        <p className="muted">
          Start free with monthly tutor contacts. Upgrade when you want unlimited messaging, request
          ads, or study tools.
        </p>
        <CompareTable
          caption="Student free vs paid features"
          freeLabel="Free account"
          paidLabel="Student Pass / Pro"
          rows={STUDENT_COMPARE_ROWS}
        />
        <p className="section-actions">
          <Link href="/search" className="btn btn-secondary">
            Find tutors free
          </Link>
          <Link href="/pricing?plan=STUDENT_PASS" className="btn">
            See Student Pass
          </Link>
        </p>
      </section>

      <section className="compare-section">
        <h2>For tutors</h2>
        <p className="muted">
          List for free with a complete profile. Tutor Pro adds growth tools; Listing Boost is
          optional.
        </p>
        <CompareTable
          caption="Tutor free vs paid features"
          freeLabel="Tutor Free"
          paidLabel="Tutor Pro & add-ons"
          rows={TUTOR_COMPARE_ROWS}
        />
        <p className="section-actions">
          <Link href="/become-a-tutor" className="btn btn-secondary">
            Become a tutor
          </Link>
          <Link href="/pricing" className="btn">
            Tutor plans
          </Link>
        </p>
      </section>

      {showFaq ? (
        <section className="compare-section">
          <h2>Common questions</h2>
          <div className="faq-list">
            {FREE_VS_PAID_FAQS.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
