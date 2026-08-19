"use client";

import { useState } from "react";

// TODO: replace with Prisma query
const MOCK_SUBSCRIPTIONS = [
  {
    id: "sub_1",
    userId: "user_1",
    userName: "Alice Johnson",
    userEmail: "alice@example.com",
    role: "tutor",
    plan: "pro",
    status: "active",
    billingPeriod: "monthly",
    currency: "GBP",
    priceAmount: 9.99,
    startDate: "2026-01-15",
    endDate: null as string | null,
    notes: null as string | null,
  },
  {
    id: "sub_2",
    userId: "user_2",
    userName: "Bob Smith",
    userEmail: "bob@example.com",
    role: "tutor",
    plan: "elite",
    status: "active",
    billingPeriod: "annual",
    currency: "GBP",
    priceAmount: 191.88,
    startDate: "2026-03-01",
    endDate: "2027-03-01",
    notes: null as string | null,
  },
  {
    id: "sub_3",
    userId: "user_3",
    userName: "Carol Williams",
    userEmail: "carol@example.com",
    role: "student",
    plan: "study_plus",
    status: "active",
    billingPeriod: "monthly",
    currency: "GBP",
    priceAmount: 4.99,
    startDate: "2026-05-10",
    endDate: null as string | null,
    notes: null as string | null,
  },
  {
    id: "sub_4",
    userId: "user_4",
    userName: "David Brown",
    userEmail: "david@example.com",
    role: "student",
    plan: "study_pro",
    status: "cancelled",
    billingPeriod: "monthly",
    currency: "USD",
    priceAmount: 11.99,
    startDate: "2025-11-01",
    endDate: "2026-04-01",
    notes: "Cancelled by user",
  },
  {
    id: "sub_5",
    userId: "user_5",
    userName: "Emma Davis",
    userEmail: "emma@example.com",
    role: "tutor",
    plan: "pro",
    status: "trial",
    billingPeriod: "monthly",
    currency: "GBP",
    priceAmount: 0,
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    notes: "14-day trial",
  },
  {
    id: "sub_6",
    userId: "user_6",
    userName: "Frank Miller",
    userEmail: "frank@example.com",
    role: "tutor",
    plan: "elite",
    status: "active",
    billingPeriod: "monthly",
    currency: "USD",
    priceAmount: 24.99,
    startDate: "2026-06-01",
    endDate: null as string | null,
    notes: null as string | null,
  },
  {
    id: "sub_7",
    userId: "user_7",
    userName: "Grace Lee",
    userEmail: "grace@example.com",
    role: "student",
    plan: "study_plus",
    status: "expired",
    billingPeriod: "annual",
    currency: "GBP",
    priceAmount: 47.88,
    startDate: "2025-07-01",
    endDate: "2026-07-01",
    notes: null as string | null,
  },
];

type Subscription = (typeof MOCK_SUBSCRIPTIONS)[0];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Tutor Pro",
  elite: "Tutor Elite",
  study_plus: "Student Plus",
  study_pro: "Student Pro",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#16a34a",
  cancelled: "#dc2626",
  expired: "#9ca3af",
  trial: "#2563eb",
};

function statusBadge(status: string) {
  return (
    <span
      style={{
        background: STATUS_COLORS[status] ?? "#6b7280",
        color: "#fff",
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

export default function SubscriptionsPage() {
  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [toast, setToast] = useState("");

  const subs = MOCK_SUBSCRIPTIONS.filter((s) => {
    if (filterPlan && s.plan !== filterPlan) return false;
    if (filterRole && s.role !== filterRole) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  const totalSubs = MOCK_SUBSCRIPTIONS.length;
  const activeProTutors = MOCK_SUBSCRIPTIONS.filter(
    (s) => s.plan === "pro" && s.role === "tutor" && s.status === "active"
  ).length;
  const activeEliteTutors = MOCK_SUBSCRIPTIONS.filter(
    (s) => s.plan === "elite" && s.role === "tutor" && s.status === "active"
  ).length;
  const activeStudentPlans = MOCK_SUBSCRIPTIONS.filter(
    (s) => s.role === "student" && s.status === "active"
  ).length;
  const mrr = MOCK_SUBSCRIPTIONS.filter((s) => s.status === "active").reduce(
    (acc, s) =>
      acc +
      (s.billingPeriod === "annual" ? s.priceAmount / 12 : s.priceAmount),
    0
  );

  function openEdit(sub: Subscription) {
    setEditTarget(sub);
    setEditPlan(sub.plan);
    setEditStatus(sub.status);
    setEditNotes(sub.notes ?? "");
  }

  function handleSave() {
    setEditTarget(null);
    setToast("Plan updated (demo mode — payment integration pending)");
    setTimeout(() => setToast(""), 3500);
  }

  return (
    <div className="stack-lg">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Subscriptions</h1>
        <button
          className="btn btn-secondary"
          onClick={() => alert("CSV export — TODO: implement")}
        >
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Total subscribers", value: totalSubs },
          { label: "Active Pro tutors", value: activeProTutors },
          { label: "Active Elite tutors", value: activeEliteTutors },
          { label: "Active student plans", value: activeStudentPlans },
          { label: "Est. MRR (GBP/USD)", value: `£${mrr.toFixed(2)}` },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--surface, #f9fafb)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        >
          <option value="">All plans</option>
          {Object.entries(PLAN_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>
              {lbl}
            </option>
          ))}
        </select>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        >
          <option value="">All roles</option>
          <option value="tutor">Tutor</option>
          <option value="student">Student</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="trial">Trial</option>
        </select>
        <span style={{ color: "#6b7280", fontSize: 13, alignSelf: "center" }}>
          {subs.length} result{subs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              {[
                "Name",
                "Email",
                "Role",
                "Plan",
                "Status",
                "Billing",
                "Price",
                "Start",
                "End",
                "Actions",
              ].map((h) => (
                <th key={h} style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.map((sub, i) => (
              <tr
                key={sub.id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: i % 2 === 0 ? "transparent" : "var(--surface, #f9fafb)",
                }}
              >
                <td style={{ padding: "8px 12px", fontWeight: 500 }}>{sub.userName}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>{sub.userEmail}</td>
                <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>{sub.role}</td>
                <td style={{ padding: "8px 12px" }}>{PLAN_LABELS[sub.plan] ?? sub.plan}</td>
                <td style={{ padding: "8px 12px" }}>{statusBadge(sub.status)}</td>
                <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>
                  {sub.billingPeriod}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {sub.currency === "GBP" ? "£" : "$"}
                  {sub.priceAmount.toFixed(2)}
                </td>
                <td style={{ padding: "8px 12px" }}>{sub.startDate}</td>
                <td style={{ padding: "8px 12px" }}>{sub.endDate ?? "—"}</td>
                <td style={{ padding: "8px 12px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => openEdit(sub)}
                  >
                    Edit Plan
                  </button>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "24px 12px", textAlign: "center", color: "#9ca3af" }}>
                  No subscriptions match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Plan Modal */}
      {editTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 28,
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Edit Plan</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 18 }}>
              {editTarget.userName} &bull; {editTarget.userEmail}
            </p>

            <label style={{ display: "block", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Plan</div>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              >
                {Object.entries(PLAN_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "block", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Status</div>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              >
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="trial">Trial</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Admin notes</div>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#16a34a",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            zIndex: 10000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
