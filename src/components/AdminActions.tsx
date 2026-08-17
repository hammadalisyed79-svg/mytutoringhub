"use client";

import { useState, type FormEvent } from "react";

async function postAdmin(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Action failed");
  }
  return data;
}

export function AdminActionButton({
  action,
  id,
  label,
  extra,
  confirm,
  danger,
  promptLabel,
  promptKey,
  typedValue,
}: {
  action: string;
  id?: string;
  label: string;
  extra?: Record<string, unknown>;
  confirm?: string;
  danger?: boolean;
  promptLabel?: string;
  promptKey?: string;
  typedValue?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    const payload: Record<string, unknown> = { action, ...(id ? { id } : {}), ...extra };
    if (promptKey) {
      const value = window.prompt(promptLabel || "Enter a value");
      if (value == null) return;
      payload[promptKey] = value;
    }
    if (typedValue) {
      const value = window.prompt(`Type ${typedValue} to confirm`);
      if (value !== typedValue) {
        window.alert("Confirmation did not match.");
        return;
      }
      payload.confirmEmail = value;
    }
    setBusy(true);
    try {
      await postAdmin(payload);
      window.location.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Action failed");
      setBusy(false);
    }
  }

  return (
    <button
      className={danger ? "link-btn admin-danger" : "link-btn"}
      type="button"
      disabled={busy}
      onClick={run}
    >
      {busy ? "Working…" : label}
    </button>
  );
}

export function AdminHideAdButton({ id }: { id: string }) {
  return (
    <AdminActionButton
      action="hide_ad"
      id={id}
      label="Hide"
      confirm="Hide this student ad from the public list?"
    />
  );
}

export function AdminToggleTutorButton({ id, active }: { id: string; active: boolean }) {
  return (
    <AdminActionButton
      action={active ? "deactivate_tutor" : "activate_tutor"}
      id={id}
      label={active ? "Deactivate" : "Activate"}
      confirm={
        active
          ? "Hide this tutor listing from search?"
          : "Force-activate this listing even without a paid plan?"
      }
    />
  );
}

export function AdminGrantPlanForm({ userId }: { userId?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await postAdmin({
        action: "grant_plan",
        id: userId,
        email: userId ? undefined : String(fd.get("email") || "").trim().toLowerCase(),
        plan: String(fd.get("plan")),
        days: Number(fd.get("days") || 30),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant plan");
      setBusy(false);
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={submit}>
      {!userId && (
        <input name="email" type="email" required placeholder="User email" aria-label="User email" />
      )}
      <select name="plan" required defaultValue="STUDENT_PASS">
        <option value="STUDENT_PASS">Student Pass</option>
        <option value="TUTOR_BASIC">Tutor Basic</option>
        <option value="VERIFIED_TUTOR">Verified Tutor</option>
        <option value="HIGHLIGHTED_AD">Highlighted Listing</option>
        <option value="AD_BOOST">Ad Boost</option>
        <option value="UNLIMITED_ADS">Unlimited Ads</option>
      </select>
      <input name="days" type="number" min={1} max={730} defaultValue={30} aria-label="Days" />
      <button className="btn btn-sm" type="submit" disabled={busy}>
        {busy ? "Granting…" : "Grant / extend"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export function AdminRoleForm({ userId, role }: { userId: string; role: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextRole = String(fd.get("role"));
    if (nextRole === "ADMIN" && !window.confirm("Promote this user to ADMIN? They will have full site control.")) {
      return;
    }
    if (nextRole !== role && !window.confirm(`Change role from ${role} to ${nextRole}?`)) return;
    setBusy(true);
    setError("");
    try {
      await postAdmin({
        action: "set_role",
        id: userId,
        role: nextRole,
        confirmAdmin: nextRole === "ADMIN",
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change role");
      setBusy(false);
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={submit}>
      <select name="role" defaultValue={role}>
        <option value="STUDENT">STUDENT</option>
        <option value="TUTOR">TUTOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <button className="btn btn-sm" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Change role"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export function AdminDeleteUserForm({ userId, email }: { userId: string; email: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const typed = String(new FormData(e.currentTarget).get("confirmEmail") || "");
    if (typed.toLowerCase() !== email.toLowerCase()) {
      setError("Email did not match.");
      return;
    }
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await postAdmin({ action: "delete_user", id: userId, confirmEmail: typed });
      window.location.href = "/admin/users";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <p className="muted">
        Hard delete removes the account and cascaded data. Prefer suspend unless you are sure.
      </p>
      <label>
        Type {email} to delete
        <input name="confirmEmail" required autoComplete="off" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-sm admin-danger-btn" type="submit" disabled={busy}>
        {busy ? "Deleting…" : "Permanently delete user"}
      </button>
    </form>
  );
}

export function AdminTutorEditForm({
  tutor,
}: {
  tutor: {
    id: string;
    headline: string | null;
    bio: string;
    subjects: string;
    hourlyRate: number;
    location: string;
    online: boolean;
    inPerson: boolean;
    verified: boolean;
    active: boolean;
  };
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await postAdmin({
        action: "update_tutor",
        id: tutor.id,
        headline: String(fd.get("headline") || ""),
        bio: String(fd.get("bio") || ""),
        subjects: String(fd.get("subjects") || ""),
        hourlyRate: Number(fd.get("hourlyRate")),
        location: String(fd.get("location") || ""),
        online: fd.get("online") === "on",
        inPerson: fd.get("inPerson") === "on",
        verified: fd.get("verified") === "on",
        active: fd.get("active") === "on",
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label>
        Headline
        <input name="headline" defaultValue={tutor.headline || ""} />
      </label>
      <label>
        Bio
        <textarea name="bio" rows={5} required defaultValue={tutor.bio} />
      </label>
      <label>
        Subjects
        <input name="subjects" required defaultValue={tutor.subjects} />
      </label>
      <label>
        Hourly rate (PKR base)
        <input name="hourlyRate" type="number" min={0} step={50} defaultValue={tutor.hourlyRate} />
      </label>
      <label>
        Location
        <input name="location" required defaultValue={tutor.location} />
      </label>
      <label className="radio">
        <input name="online" type="checkbox" defaultChecked={tutor.online} /> Online
      </label>
      <label className="radio">
        <input name="inPerson" type="checkbox" defaultChecked={tutor.inPerson} /> In person
      </label>
      <label className="radio">
        <input name="verified" type="checkbox" defaultChecked={tutor.verified} /> Verified badge
      </label>
      <label className="radio">
        <input name="active" type="checkbox" defaultChecked={tutor.active} /> Active listing
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save listing"}
      </button>
    </form>
  );
}

export function AdminBoostForm({
  id,
  action,
  label,
}: {
  id: string;
  action: "set_highlight" | "set_boost";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const days = Number(new FormData(e.currentTarget).get("days") || 30);
    setBusy(true);
    setError("");
    try {
      await postAdmin({ action, id, days });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={submit}>
      <input name="days" type="number" min={1} max={365} defaultValue={30} aria-label="Days" />
      <button className="btn btn-sm" type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export function AdminSettingsForm({
  settings,
}: {
  settings: {
    maintenanceMode: boolean;
    homepageAnnouncement: string;
    disableSignups: boolean;
    disableAiAssistant: boolean;
  };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await postAdmin({
        action: "update_settings",
        maintenanceMode: fd.get("maintenanceMode") === "on",
        disableSignups: fd.get("disableSignups") === "on",
        disableAiAssistant: fd.get("disableAiAssistant") === "on",
        homepageAnnouncement: String(fd.get("homepageAnnouncement") || ""),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label>
        Homepage announcement
        <textarea
          name="homepageAnnouncement"
          rows={3}
          defaultValue={settings.homepageAnnouncement}
          placeholder="Shown to everyone at the top of the site"
        />
      </label>
      <label className="radio">
        <input name="maintenanceMode" type="checkbox" defaultChecked={settings.maintenanceMode} />
        Maintenance mode (non-admins see a holding page)
      </label>
      <label className="radio">
        <input name="disableSignups" type="checkbox" defaultChecked={settings.disableSignups} />
        Disable new signups
      </label>
      <label className="radio">
        <input name="disableAiAssistant" type="checkbox" defaultChecked={settings.disableAiAssistant} />
        Disable study assistant
      </label>
      {error && <p className="form-error">{error}</p>}
      <p className="muted">
        For a live site, leave maintenance mode off, keep signups enabled, and clear any “under
        construction” announcement.
      </p>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save site settings"}
      </button>
    </form>
  );
}

export function AdminPlanPricesForm({
  plans,
}: {
  plans: {
    id: string;
    name: string;
    description: string;
    audience: string;
    pricePkr: number;
    isAddOn?: boolean;
    promoEnabled?: boolean;
    promoPricePkr?: number;
    promoUntil?: string;
    promoLabel?: string;
    promoNote?: string;
    isPromoActive?: boolean;
    isComplimentary?: boolean;
  }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await postAdmin({
        action: "update_plan_prices",
        plans: plans.map((plan) => ({
          id: plan.id,
          name: String(fd.get(`${plan.id}-name`) || "").trim(),
          description: String(fd.get(`${plan.id}-description`) || "").trim(),
          pricePkr: Number(fd.get(`${plan.id}-pricePkr`)),
          promoEnabled: fd.get(`${plan.id}-promoEnabled`) === "on",
          promoPricePkr: Number(fd.get(`${plan.id}-promoPricePkr`) || 0),
          promoUntil: String(fd.get(`${plan.id}-promoUntil`) || ""),
          promoLabel: String(fd.get(`${plan.id}-promoLabel`) || "").trim(),
          promoNote: String(fd.get(`${plan.id}-promoNote`) || "").trim(),
        })),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plans");
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <div className="admin-plan-grid">
        {plans.map((plan) => (
          <article key={plan.id} className="panel admin-plan-card">
            <p className="muted" style={{ marginTop: 0 }}>
              {plan.audience === "student" ? "Student" : "Tutor"}
              {plan.isAddOn ? " add-on" : " listing"} · {plan.id}
              {plan.isComplimentary ? " · Complimentary now" : plan.isPromoActive ? " · Promo live" : ""}
            </p>
            <label>
              Display name
              <input name={`${plan.id}-name`} defaultValue={plan.name} required maxLength={80} />
            </label>
            <label>
              Standard price (PKR / month)
              <input
                name={`${plan.id}-pricePkr`}
                type="number"
                min={0}
                step={1}
                defaultValue={plan.pricePkr}
                required
              />
            </label>
            <label>
              Short description
              <textarea
                name={`${plan.id}-description`}
                rows={2}
                defaultValue={plan.description}
                maxLength={300}
              />
            </label>
            <div className="admin-plan-promo">
              <p className="admin-plan-promo-title">Limited-time offer</p>
              <label className="radio">
                <input
                  name={`${plan.id}-promoEnabled`}
                  type="checkbox"
                  defaultChecked={Boolean(plan.promoEnabled)}
                />
                Enable promotional pricing
              </label>
              <label>
                Promo price (PKR / month)
                <input
                  name={`${plan.id}-promoPricePkr`}
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={plan.promoPricePkr ?? 0}
                />
                <span className="muted" style={{ fontWeight: 400, fontSize: "0.82rem" }}>
                  Use 0 for a complimentary period. After the end date, the standard price applies automatically.
                </span>
              </label>
              <label>
                Offer valid until
                <input
                  name={`${plan.id}-promoUntil`}
                  type="date"
                  defaultValue={plan.promoUntil || ""}
                />
              </label>
              <label>
                Offer label
                <input
                  name={`${plan.id}-promoLabel`}
                  defaultValue={plan.promoLabel || ""}
                  maxLength={60}
                  placeholder="Launch offer"
                />
              </label>
              <label>
                Customer-facing note
                <textarea
                  name={`${plan.id}-promoNote`}
                  rows={2}
                  defaultValue={plan.promoNote || ""}
                  maxLength={280}
                  placeholder="Complimentary listing until 30 September. Badges and boosts remain paid."
                />
              </label>
            </div>
          </article>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save plans, prices & offers"}
      </button>
    </form>
  );
}

export function AdminSubjectCreateForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") || "").trim();
    setBusy(true);
    setError("");
    try {
      await postAdmin({ action: "subject_create", name });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add subject");
      setBusy(false);
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={submit}>
      <input name="name" required placeholder="New subject name" />
      <button className="btn btn-sm" type="submit" disabled={busy}>
        {busy ? "Adding…" : "Add subject"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export function AdminSubjectRenameForm({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = String(new FormData(e.currentTarget).get("name") || "").trim();
    if (!next || next === name) return;
    setBusy(true);
    try {
      await postAdmin({ action: "subject_rename", id, name: next });
      window.location.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Rename failed");
      setBusy(false);
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={submit}>
      <input name="name" defaultValue={name} required />
      <button className="link-btn" type="submit" disabled={busy}>
        Rename
      </button>
    </form>
  );
}
