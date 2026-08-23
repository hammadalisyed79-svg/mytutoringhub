import Link from "next/link";
import { getTutorSupplyGapReport, getTutorSupplyOverview } from "@/lib/tutor-supply-metrics";
import { selectTutorRecoveryAudience } from "@/lib/tutor-recovery-audience";
import {
  prepareTutorRecoveryCampaign,
  recoveryEmailStageCopy,
} from "@/lib/tutor-recovery-campaign";
import { getRecoveryEmail1Preview } from "@/lib/tutor-recovery-send";
import { AdminRecoveryEmail1Panel } from "@/components/AdminRecoveryEmail1Panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutor supply" };

export default async function AdminTutorSupplyPage() {
  const [overview, gap, recovery, campaign, email1Preview] = await Promise.all([
    getTutorSupplyOverview(),
    getTutorSupplyGapReport(20),
    selectTutorRecoveryAudience({ limit: 500 }),
    prepareTutorRecoveryCampaign(),
    getRecoveryEmail1Preview(),
  ]);
  const email1 = recoveryEmailStageCopy(1);

  return (
    <>
      <div>
        <h1 className="page-title">Tutor supply</h1>
        <p className="muted">
          Real marketplace counts for recruitment priorities. No fake activity. Bulk email is never
          sent from this page — review the campaign below, then use an explicit admin send action
          only when ready.
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
        <h2>Recovery campaign preview</h2>
        <p className="success" role="status">
          <strong>SEND STATUS: {campaign.sendStatus}</strong> — this page does not send email.
        </p>
        <p className="muted">
          Eligible audience: <strong>{campaign.audience.eligibleCount}</strong> · Priority group:{" "}
          <strong>{campaign.priorityGroup.length}</strong> · Personal follow-up shortlist:{" "}
          <strong>{campaign.personalFollowUp.length}</strong>
        </p>
        <ul className="muted">
          <li>Nearly complete (1–2 missing): {campaign.bands.nearly_complete}</li>
          <li>Partially complete (3–4 missing): {campaign.bands.partially_complete}</li>
          <li>Early profile (5+ missing): {campaign.bands.early_profile}</li>
          <li>
            With subjects: {campaign.withSubjects} · No subjects yet: {campaign.withoutSubjects}
          </li>
          <li>
            Exclusions — suspicious: {campaign.audience.excluded.suspiciousName}, unverified:{" "}
            {campaign.audience.excluded.unverifiedEmail}, suspended:{" "}
            {campaign.audience.excluded.suspended}, already-live:{" "}
            {campaign.audience.excluded.alreadyLive}
          </li>
        </ul>
        <h3>Email 1 (prepared, not sent)</h3>
        <p>
          <strong>Subject:</strong> {email1.subject}
        </p>
        <p>
          <strong>CTA:</strong> {email1.cta}
        </p>
        <p className="muted">{email1.bodyPreview}</p>
        <AdminRecoveryEmail1Panel preview={email1Preview} />
        <p className="muted">
          CLI prep: <code>npx tsx scripts/tutor-recovery-campaign-prep.ts</code>
          <br />
          Sent history: <Link href="/admin/nurture?profile=1">Nurture · profile sequences</Link>
          <br />
          Candidate list: <Link href="/admin/tutors?supply=incomplete">Incomplete tutors</Link>
        </p>
      </section>

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
