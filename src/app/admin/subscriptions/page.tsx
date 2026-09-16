"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { currencyToPkr, formatMoney, FX_PER_USD, type CurrencyCode } from "@/lib/currency";

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

function asCurrency(code: string): CurrencyCode {
  const upper = (code || "PKR").toUpperCase();
  return (upper in FX_PER_USD ? upper : "PKR") as CurrencyCode;
}

function formatSubPrice(sub: Subscription) {
  return formatMoney(Number(sub.priceAmount || 0), asCurrency(sub.currency));
}

function monthlyPkr(sub: Subscription) {
  const amount = Number(sub.priceAmount || 0);
  if (amount <= 0 || sub.billingPeriod === "once") return 0;
  const monthly = sub.billingPeriod === "annual" ? amount / 12 : amount;
  return currencyToPkr(monthly, asCurrency(sub.currency));
}

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: "STUDENT_PASS", label: "Student Pass" },
  { value: "STUDENT_PRO", label: "Student Pro" },
  { value: "TUTOR_BASIC", label: "Tutor Pro" },
  { value: "VERIFIED_TUTOR", label: "Priority Verification Review" },
  { value: "HIGHLIGHTED_AD", label: "Listing Highlight (legacy)" },
  { value: "AD_BOOST", label: "Listing Boost" },
  { value: "EXTRA_PROFILE_ADS", label: "Extra Profile Ads (legacy)" },
  { value: "UNLIMITED_ADS", label: "Unlimited Profiles (legacy)" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "active",
  TRIALING: "trialing",
  CANCELED: "canceled",
  PAST_DUE: "past_due",
  INCOMPLETE: "incomplete",
};

function statusBadge(status: string) {
  const tone = STATUS_COLORS[status] ?? "";
  return (
    <span className={`admin-badge${tone ? ` admin-badge--${tone}` : ""}`}>
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
  const mrrPkr = subs.filter(active).reduce((acc, s) => acc + monthlyPkr(s), 0);

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
        setTimeout(() => setToast(""), 4500);
        return;
      }
      setEditTarget(null);
      if (data.warning) {
        setToast(data.warning);
      } else {
        setToast(data.message || "Subscription updated");
      }
      setTimeout(() => setToast(""), 4500);
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
      <header className="panel page-hero">
        <div className="page-hero-copy">
          <h1 className="page-title">Subscriptions</h1>
          <p className="muted">
            Entitlements — who has which plan and status. For checkout recovery use{" "}
            <Link href="/admin/payments">Payments</Link>; for cash analytics use{" "}
            <Link href="/admin/revenue">Revenue</Link>. Amounts use the charged currency (PKR base
            when unknown).
          </p>
        </div>
        <div className="page-hero-actions">
          <button className="btn btn-secondary btn-sm" type="button" onClick={exportCsv} disabled={loading}>
            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <p className="form-error" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      <div className="admin-kpi-grid">
        {[
          { label: "Total subscriptions", value: totalSubs },
          { label: "Active Tutor Pro", value: activeProTutors },
          { label: "Active tutor add-ons", value: activeEliteTutors },
          { label: "Active student plans", value: activeStudentPlans },
          { label: "Est. MRR (PKR)", value: formatMoney(mrrPkr, "PKR") },
        ].map((card) => (
          <div key={card.label} className="admin-kpi">
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </div>
        ))}
      </div>

      <form className="filters filters-wide" onSubmit={(e) => e.preventDefault()}>
        <label>
          Plan
          <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
            <option value="">All plans</option>
            {PLAN_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="tutor">Tutor</option>
            <option value="student">Student</option>
          </select>
        </label>
        <label>
          Status
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIALING">Trialing</option>
            <option value="CANCELED">Canceled</option>
            <option value="PAST_DUE">Past due</option>
            <option value="INCOMPLETE">Incomplete</option>
          </select>
        </label>
        <span className="muted" style={{ alignSelf: "end", paddingBottom: "0.45rem" }}>
          {loading ? "Loading…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
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
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.id}>
                <td>
                  <strong>{sub.userName}</strong>
                </td>
                <td className="muted">{sub.userEmail}</td>
                <td style={{ textTransform: "capitalize" }}>{sub.role}</td>
                <td>{sub.planLabel}</td>
                <td>{statusBadge(sub.status)}</td>
                <td style={{ textTransform: "capitalize" }}>{sub.billingPeriod}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatSubPrice(sub)}</td>
                <td>{formatDate(sub.startDate)}</td>
                <td>{formatDate(sub.endDate)}</td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
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
                <td colSpan={10} className="muted" style={{ textAlign: "center" }}>
                  No subscriptions match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}
        >
          <div className="admin-modal" style={{ maxWidth: 420 }}>
            <h2 className="admin-modal-title">Edit Plan</h2>
            <p className="muted admin-modal-lead">
              {editTarget.userName} · {editTarget.userEmail}
            </p>

            <label className="admin-modal-label">
              <span>Plan</span>
              <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-modal-label">
              <span>Status</span>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="TRIALING">Trialing</option>
                <option value="CANCELED">Canceled</option>
                <option value="PAST_DUE">Past due</option>
                <option value="INCOMPLETE">Incomplete</option>
              </select>
            </label>

            <label className="admin-modal-label">
              <span>Admin notes</span>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes..."
              />
            </label>

            <div className="admin-modal-actions">
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-sm" type="button" onClick={handleSave} disabled={saving}>
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
            background:
              toast.toLowerCase().includes("fail") ||
              toast.toLowerCase().includes("error") ||
              toast.toLowerCase().includes("audit")
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
