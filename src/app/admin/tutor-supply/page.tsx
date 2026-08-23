import Link from "next/link";
import { getTutorSupplyGapReport, getTutorSupplyOverview } from "@/lib/tutor-supply-metrics";
import { selectTutorRecoveryAudience } from "@/lib/tutor-recovery-audience";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutor supply" };

export default async function AdminTutorSupplyPage() {
  const [overview, gap, recovery] = await Promise.all([
    getTutorSupplyOverview(),
    getTutorSupplyGapReport(20),
    selectTutorRecoveryAudience({ limit: 500 }),
  ]);

  return (
    <>
      <div>
        <h1 className="page-title">Tutor supply</h1>
        <p className="muted">
          Real marketplace counts for recruitment priorities. No fake activity. Bulk email is never
          sent from this page — use the dry-run script, then an explicit admin send action.
        </p>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat">
          <strong>{overview.totalTutorAccounts}</strong>
          <span>Tutor accounts</span>
        </div>
        <div className="admin-stat">
          <strong>{overview.live}</strong>
          <span>Live / public</span>
        </div>
        <div className="admin-stat">
          <strong>{overview.incomplete}</strong>
          <span>Incomplete</span>
        </div>
        <div className="admin-stat">
          <strong>{recovery.eligibleCount}</strong>
          <span>Recovery audience (verified, incomplete)</span>
        </div>
        <div className="admin-stat">
          <strong>{overview.suspended}</strong>
          <span>Suspended</span>
        </div>
        <div className="admin-stat">
          <strong>{overview.suspiciousHidden}</strong>
          <span>Suspicious hidden</span>
        </div>
      </div>

      <section className="panel">
        <h2>Recovery dry-run exclusions</h2>
        <p className="muted">
          Scanned {recovery.totalScanned} inactive profiles. Eligible for outreach:{" "}
          <strong>{recovery.eligibleCount}</strong> (emails not listed here).
        </p>
        <ul className="muted">
          <li>Excluded suspicious names: {recovery.excluded.suspiciousName}</li>
          <li>Excluded unverified email: {recovery.excluded.unverifiedEmail}</li>
          <li>Excluded complete-but-hidden: {recovery.excluded.completeButHidden}</li>
        </ul>
        <p className="muted">
          CLI: <code>npx tsx scripts/tutor-recovery-dry-run.ts</code>
        </p>
        <Link href="/admin/tutors?supply=incomplete">Open incomplete tutor list</Link>
      </section>

      <section className="panel">
        <h2>Subject supply gaps</h2>
        <p className="muted">
          Sorted by open student requests minus live tutors (then demand). Use for recruitment focus
          — not every subject needs equal hiring.
        </p>
        {gap.length === 0 ? (
          <p className="muted">No subject data yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Live tutors</th>
                  <th>Incomplete</th>
                  <th>Open student requests</th>
                </tr>
              </thead>
              <tbody>
                {gap.map((row) => (
                  <tr key={row.subject}>
                    <td>{row.subject}</td>
                    <td>{row.liveTutors}</td>
                    <td>{row.incompleteTutors}</td>
                    <td>{row.openStudentRequests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
