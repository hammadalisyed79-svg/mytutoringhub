"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Subscription = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  plan: string;
  planLabel: string;
  status: string;
  billingPeriod: string;
  currency: string;
  priceAmount: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
};

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: "STUDENT_PASS", label: "Student Pass" },
  { value: "STUDENT_PRO", label: "Student Pro" },
  { value: "TUTOR_BASIC", label: "Tutor Basic" },
  { value: "VERIFIED_TUTOR", label: "Verified Tutor" },
  { value: "HIGHLIGHTED_AD", label: "Highlighted Listing" },
  { value: "AD_BOOST", label: "Profile Boost" },
  { value: "EXTRA_PROFILE_ADS", label: "Extra Profile Ads" },
  { value: "UNLIMITED_ADS", label: "Unlimited Profiles" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#16a34a",
  TRIALING: "#2563eb",
  CANCELED: "#dc2626",
  PAST_DUE: "#d97706",
  INCOMPLETE: "#9ca3af",
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
      {status.toLowerCase()}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/subscriptions");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load subscriptions");
        setSubs([]);
        return;
      }
      setSubs(data.subscriptions || []);
    } catch {
      setError("Network error loading subscriptions");
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (filterPlan && s.plan !== filterPlan) return false;
      if (filterRole && s.role !== filterRole) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      return true;
    });
  }, [subs, filterPlan, filterRole, filterStatus]);

  const active = (s: Subscription) => s.status === "ACTIVE" || s.status === "TRIALING";
  const totalSubs = subs.length;
  const activeProTutors = subs.filter(
    (s) => s.plan === "TUTOR_BASIC" && s.role === "tutor" && active(s),
  ).length;
  const activeEliteTutors = subs.filter(
    (s) =>
      ["VERIFIED_TUTOR", "HIGHLIGHTED_AD", "AD_BOOST", "EXTRA_PROFILE_ADS", "UNLIMITED_ADS"].includes(s.plan) &&
      s.role === "tutor" &&
      active(s),
  ).length;
  const activeStudentPlans = subs.filter(
    (s) => (s.plan === "STUDENT_PASS" || s.plan === "STUDENT_PRO") && active(s),
  ).length;
  const mrr = subs.filter(active).reduce((acc, s) => {
    const amount = s.priceAmount || 0;
    return acc + (s.billingPeriod === "annual" ? amount / 12 : amount);
  }, 0);

  function openEdit(sub: Subscription) {
    setEditTarget(sub);
    setEditPlan(sub.plan);
    setEditStatus(sub.status);
    setEditNotes(sub.notes ?? "");
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: editTarget.id,
          plan: editPlan,
          status: editStatus,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error || "Update failed");
        setTimeout(() => setToast(""), 3500);
        return;
      }
      setEditTarget(null);
      setToast("Subscription updated");
      setTimeout(() => setToast(""), 3500);
      await load();
    } catch {
      setToast("Network error");
      setTimeout(() => setToast(""), 3500);
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    window.location.href = "/api/admin/subscriptions?format=csv";
  }

  return (
    <div className="stack-lg">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Subscriptions</h1>
        <button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={loading}>
          Export CSV
        </button>
      </div>

      {error && (
        <p className="form-error" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Total subscriptions", value: totalSubs },
          { label: "Active Tutor Basic", value: activeProTutors },
          { label: "Active tutor add-ons", value: activeEliteTutors },
          { label: "Active student plans", value: activeStudentPlans },
          { label: "Est. MRR (stored price)", value: `£${mrr.toFixed(2)}` },
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
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        >
          <option value="">All plans</option>
          {PLAN_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
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
          <option value="ACTIVE">Active</option>
          <option value="TRIALING">Trialing</option>
          <option value="CANCELED">Canceled</option>
          <option value="PAST_DUE">Past due</option>
          <option value="INCOMPLETE">Incomplete</option>
        </select>
        <span style={{ color: "#6b7280", fontSize: 13, alignSelf: "center" }}>
          {loading ? "Loading…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

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
            {filtered.map((sub, i) => (
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
                <td style={{ padding: "8px 12px" }}>{sub.planLabel}</td>
                <td style={{ padding: "8px 12px" }}>{statusBadge(sub.status)}</td>
                <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>
                  {sub.billingPeriod}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {sub.currency === "GBP" ? "£" : sub.currency === "USD" ? "$" : `${sub.currency} `}
                  {Number(sub.priceAmount || 0).toFixed(2)}
                </td>
                <td style={{ padding: "8px 12px" }}>{formatDate(sub.startDate)}</td>
                <td style={{ padding: "8px 12px" }}>{formatDate(sub.endDate)}</td>
                <td style={{ padding: "8px 12px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    type="button"
                    onClick={() => openEdit(sub)}
                  >
                    Edit Plan
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{ padding: "24px 12px", textAlign: "center", color: "#9ca3af" }}
                >
                  No subscriptions match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
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
                <option value="ACTIVE">Active</option>
                <option value="TRIALING">Trialing</option>
                <option value="CANCELED">Canceled</option>
                <option value="PAST_DUE">Past due</option>
                <option value="INCOMPLETE">Incomplete</option>
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
              <button className="btn btn-secondary" type="button" onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: toast.toLowerCase().includes("fail") || toast.toLowerCase().includes("error")
              ? "#dc2626"
              : "#16a34a",
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
