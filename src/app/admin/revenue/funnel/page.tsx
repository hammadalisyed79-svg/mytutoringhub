import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { computeRevenueIntelligence } from "@/lib/revenue-intelligence";

export const dynamic = "force-dynamic";

function fmt(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div
      style={{
        background: "var(--surface, #f9fafb)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
      {hint ? (
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{hint}</div>
      ) : null}
    </div>
  );
}

export default async function RevenueFunnelPage() {
  await requireAdminPage();
  const report = await computeRevenueIntelligence();
  const k = report.keyMetrics;
  const r = report.revenue;

  return (
    <div className="stack-lg">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Revenue funnel (observed)</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "6px 0 0" }}>
            MTD from {new Date(report.period.since).toLocaleDateString()} — real Prisma data only. No
            forecasts. Boost performance claims remain parked.
          </p>
        </div>
        <p style={{ margin: 0 }}>
          <Link href="/admin/revenue" className="btn btn-sm btn-secondary">
            Cash / MRR view
          </Link>
        </p>
      </div>

      <section
        style={{
          border: "2px solid #0f5a46",
          borderRadius: 10,
          padding: "16px 18px",
          background: "rgba(15, 90, 70, 0.06)",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px", letterSpacing: "0.02em" }}>
          REVENUE PER NEW STUDENT–TUTOR CONNECTION
        </h2>
        <div style={{ fontSize: 32, fontWeight: 800 }}>
          {fmt(k.revenue_per_new_student_tutor_connection, 2)}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#374151" }}>
          Total platform cash this period ÷ new student↔tutor conversations. Strategically important
          because MTH takes 0% commission on lessons.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Card label="Platform revenue (MTD)" value={fmt(r.totalPlatformRevenue, 0)} />
        <Card label="New connections" value={report.marketplace.newStudentTutorConversations} />
        <Card label="Tutor response rate" value={fmtPct(k.tutor_response_rate)} />
        <Card
          label="Median time to first tutor reply (min)"
          value={fmt(k.average_or_median_time_to_first_tutor_reply_minutes, 0)}
        />
        <Card label="Match proxy YES rate" value={fmtPct(k.successful_match_proxy_rate)} />
        <Card label="Search → contact (volume)" value={fmtPct(k.search_to_contact_conversion_rate)} />
        <Card label="Contact limit → Pass" value={fmtPct(k.contact_limit_to_pass_conversion_rate)} />
        <Card label="Reveal limit → Tutor Pro" value={fmtPct(k.reveal_limit_to_pro_conversion_rate)} />
      </div>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Student funnel</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <Card label="Registrations" value={report.student.registrations} />
          <Card label="Search result views" value={report.student.searchResultViews} />
          <Card
            label="Profile views (approx)"
            value={report.student.teachingProfileViewsApprox}
            hint="Tutor ProfileView rows"
          />
          <Card label="New tutor contacts" value={report.student.newTutorContacts} />
          <Card
            label="Avg contacts / active student"
            value={fmt(report.student.averageNewContactsPerActiveStudent)}
          />
          <Card
            label="Users at contact limit"
            value={report.student.usersReachingContactLimit}
            hint={report.student.contactLimitSource}
          />
          <Card label="Student Pass activations" value={report.student.studentPassPurchases} />
          <Card label="Student Pro activations" value={report.student.studentProPurchases} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Tutor funnel</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <Card label="Registrations" value={report.tutor.registrations} />
          <Card label="Live profiles" value={report.tutor.liveProfiles} />
          <Card label="Active Free tutors" value={report.tutor.activeFreeTutors} />
          <Card label="Active Pro tutors" value={report.tutor.activeProTutors} />
          <Card label="Active Teaching Profiles" value={report.tutor.activeTeachingProfiles} />
          <Card label="Enquiry reveals" value={report.tutor.enquiryReveals} />
          <Card label="Reveal limit hitters" value={report.tutor.tutorsReachingRevealLimit} />
          <Card label="Tutor Pro paid" value={report.tutor.tutorProPaidActivations} />
          <Card
            label="Tutor Pro complimentary"
            value={report.tutor.tutorProComplimentaryActivations}
            hint="Cash = 0"
          />
          <Card label="Listing Boost" value={report.tutor.listingBoostPurchases} />
          <Card label="Priority Verification" value={report.tutor.priorityVerificationPurchases} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Past papers</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <Card label="Downloads (usage)" value={report.pastPapers.downloads} />
          <Card label="Pay-per-paper purchases" value={report.pastPapers.payPerPaperPurchases} />
          <Card label="Pay-per-paper PKR" value={fmt(report.pastPapers.payPerPaperRevenuePkr, 0)} />
          <Card label="Pass quota exhausted" value={report.pastPapers.passUsersReachingQuota} />
          <Card label="Pro after quota (same users)" value={report.pastPapers.studentProAfterQuota} />
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>{report.pastPapers.note}</p>
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Actual revenue (MTD)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {[
              ["Student Pass", r.studentPass],
              ["Student Pro", r.studentPro],
              ["Tutor Pro (paid only)", r.tutorProPaid],
              ["Listing Boost", r.listingBoost],
              ["Priority Verification", r.priorityVerification],
              ["Past papers (PKR)", r.pastPapersPkr],
              ["Total", r.totalPlatformRevenue],
            ].map(([label, value]) => (
              <tr key={String(label)} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px" }}>{label}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmt(Number(value), 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>{r.currencyNote}</p>
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Not yet measurable</h2>
        <ul style={{ fontSize: 13, color: "#4b5563" }}>
          {report.notYetMeasurable.map((row) => (
            <li key={row.metric} style={{ marginBottom: 6 }}>
              <strong>{row.metric}</strong> — {row.why}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
