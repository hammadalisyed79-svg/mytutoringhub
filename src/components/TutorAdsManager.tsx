"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubscribeButton } from "@/components/SubscribeButton";
import { listingPath } from "@/lib/subject-profile";
import { tutorLevelOptions } from "@/lib/tutor-catalog";
import type { CurrencyCode } from "@/lib/currency";

type Listing = {
  id: string;
  subject: string;
  title: string;
  headline: string | null;
  level: string;
  location: string;
  rate: number;
  status: string;
  online: boolean;
  inPerson: boolean;
  description: string | null;
  boostUntil: string | null;
  highlightedUntil: string | null;
};

type Entitlement = {
  activeCount: number;
  cap: number | null;
  unlimited: boolean;
  promoActive: boolean;
  promoLabel: string;
  freeCapAfterPromo: number;
  paidCap: number;
  canCreate: boolean;
  createReason: string | null;
};

function formatUntil(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function listingBoostActive(boostUntil: Date | null, now: Date) {
  if (!boostUntil || boostUntil <= now) return false;
  const daysLeft = Math.floor((boostUntil.getTime() - now.getTime()) / 86400000);
  return daysLeft % 4 === 0 || daysLeft % 4 === 3;
}

function listingHighlightActive(until: Date | null, now: Date) {
  return Boolean(until && until > now);
}

export function TutorAdsManager({
  subjects,
  extraLevels = [],
  currency = "PKR",
  paidCheckoutLive = true,
}: {
  subjects: string[];
  extraLevels?: string[];
  currency?: CurrencyCode;
  paidCheckoutLive?: boolean;
}) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetch("/api/tutor-ads")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setListings(d);
          return;
        }
        if (Array.isArray(d?.listings)) setListings(d.listings);
        if (d?.entitlement) setEntitlement(d.entitlement);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tutor-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: String(fd.get("subject")),
        title: String(fd.get("title")),
        level: String(fd.get("level") || "All levels"),
        location: String(fd.get("location")),
        rate: Number(fd.get("rate")),
        online: fd.get("online") === "on",
        inPerson: fd.get("inPerson") === "on",
        description: String(fd.get("description") || ""),
        headline: String(fd.get("headline") || ""),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create subject profile");
      return;
    }
    setMsg("Subject profile published.");
    e.currentTarget.reset();
    setShowCreate(false);
    load();
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusyId(id);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tutor-ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: String(fd.get("title")),
        headline: String(fd.get("headline") || ""),
        level: String(fd.get("level") || "All levels"),
        location: String(fd.get("location")),
        rate: Number(fd.get("rate")),
        online: fd.get("online") === "on",
        inPerson: fd.get("inPerson") === "on",
        description: String(fd.get("description") || ""),
      }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    setMsg("Subject profile updated.");
    setEditingId(null);
    load();
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    setError("");
    setBusyId(id);
    const res = await fetch("/api/tutor-ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not update status");
      return;
    }
    load();
    router.refresh();
  }

  const levels = useMemo(() => {
    const catalog = tutorLevelOptions(extraLevels);
    return ["All levels", ...catalog.core, ...catalog.more];
  }, [extraLevels]);

  const capLabel = entitlement?.unlimited
    ? "Unlimited"
    : entitlement?.cap != null
      ? String(entitlement.cap)
      : "—";

  const usedSubjects = new Set(listings.map((l) => l.subject.toLowerCase()));
  const availableSubjects = subjects.filter((s) => !usedSubjects.has(s.toLowerCase()));

  return (
    <div className="subject-profiles-manager" id="subject-profiles">
      <div className="subject-profiles-summary">
        <p className="muted" style={{ marginBottom: 0 }}>
          {entitlement?.promoLabel ||
            `After the launch promo: ${entitlement?.freeCapAfterPromo ?? 1} free active profile; Extra Profile Ads / Tutor Basic unlock up to ${entitlement?.paidCap ?? 3}; Unlimited Profiles removes the cap.`}
        </p>
        <p className="subject-profiles-meter">
          Active <strong>{entitlement?.activeCount ?? listings.filter((l) => l.status === "ACTIVE").length}</strong>
          {" / "}
          <strong>{capLabel}</strong>
        </p>
      </div>

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="subject-profiles-list">
        {listings.length === 0 && (
          <p className="muted">
            No subject profiles yet. Create one so students can find you in search for that subject.
          </p>
        )}
        {listings.map((listing) => {
          const now = new Date();
          const boostUntil = listing.boostUntil ? new Date(listing.boostUntil) : null;
          const highlightUntil = listing.highlightedUntil
            ? new Date(listing.highlightedUntil)
            : null;
          const boosted = listingBoostActive(boostUntil, now);
          const highlighted = listingHighlightActive(highlightUntil, now);
          const editing = editingId === listing.id;
          return (
            <article
              key={listing.id}
              className={`subject-profile-card${listing.status !== "ACTIVE" ? " is-paused" : ""}`}
            >
              <div className="subject-profile-card-head">
                <div>
                  <strong>{listing.title}</strong>
                  <div className="muted">
                    {listing.subject} · {listing.level} · {listing.location} · PKR {listing.rate}/hr
                  </div>
                </div>
                <div className="subject-profile-badges">
                  <span className={`badge${listing.status === "ACTIVE" ? " badge-verified" : ""}`}>
                    {listing.status}
                  </span>
                  {boosted && <span className="badge accent">Boosted</span>}
                  {highlighted && <span className="badge accent">Highlighted</span>}
                </div>
              </div>

              {(boosted || (boostUntil && boostUntil > now)) && (
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Boost until {formatUntil(listing.boostUntil)}
                  {!boosted ? " (cycles periodically)" : ""}
                </p>
              )}

              <div className="subject-profile-actions">
                <Link className="btn btn-secondary btn-sm" href={listingPath(listing.id)} target="_blank">
                  View listing
                </Link>
                {listing.status === "ACTIVE" ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => setStatus(listing.id, "PAUSED")}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => setStatus(listing.id, "ACTIVE")}
                  >
                    Activate
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => setEditingId(editing ? null : listing.id)}
                >
                  {editing ? "Close" : "Edit"}
                </button>
              </div>

              {listing.status === "ACTIVE" && (
                <div className="subject-profile-boost-row">
                  <SubscribeButton
                    plan="AD_BOOST"
                    planLabel="Profile Boost"
                    currency={currency}
                    label={boosted ? "Extend boost 30 days" : "Boost this profile"}
                    featured
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                  />
                  <SubscribeButton
                    plan="HIGHLIGHTED_AD"
                    planLabel="Highlighted Profile"
                    currency={currency}
                    label={highlighted ? "Extend highlight" : "Highlight this profile"}
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                  />
                </div>
              )}

              {editing && (
                <form
                  className="stack-form profile-form"
                  style={{ marginTop: "0.75rem" }}
                  onSubmit={(e) => saveEdit(e, listing.id)}
                >
                  <label>
                    Title
                    <input name="title" required minLength={5} defaultValue={listing.title} />
                  </label>
                  <label>
                    Headline
                    <input name="headline" defaultValue={listing.headline || ""} />
                  </label>
                  <label>
                    Level
                    <select name="level" defaultValue={listing.level}>
                      {levels.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    City
                    <input name="location" required defaultValue={listing.location} />
                  </label>
                  <label>
                    Hourly rate (PKR)
                    <input
                      name="rate"
                      type="number"
                      min={500}
                      step={100}
                      required
                      defaultValue={listing.rate}
                    />
                  </label>
                  <label>
                    Description
                    <textarea name="description" rows={2} defaultValue={listing.description || ""} />
                  </label>
                  <fieldset className="form-fieldset">
                    <legend>Lesson type</legend>
                    <div className="checks">
                      <label className="radio">
                        <input name="online" type="checkbox" defaultChecked={listing.online} /> Online
                      </label>
                      <label className="radio">
                        <input name="inPerson" type="checkbox" defaultChecked={listing.inPerson} />{" "}
                        In person
                      </label>
                    </div>
                  </fieldset>
                  <button className="btn btn-sm" type="submit" disabled={busyId === listing.id}>
                    Save changes
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>

      {showCreate ? (
        <form className="stack-form profile-form" onSubmit={create} style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Add subject profile</h3>
          <p className="field-hint">One subject per profile — students find each listing separately.</p>
          <label>
            <span>
              Subject <abbr className="req" title="Required">*</abbr>
            </span>
            <select name="subject" required defaultValue="">
              <option value="" disabled>
                Select a subject…
              </option>
              {availableSubjects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              Title <abbr className="req" title="Required">*</abbr>
            </span>
            <input name="title" required minLength={5} placeholder="A Level Maths · exam prep" />
          </label>
          <label>
            Headline
            <input name="headline" placeholder="Short line on the search card" />
          </label>
          <label>
            Level
            <select name="level" defaultValue="All levels">
              {levels.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              City <abbr className="req" title="Required">*</abbr>
            </span>
            <input name="location" required placeholder="City or Online" />
          </label>
          <label>
            <span>
              Hourly rate (PKR) <abbr className="req" title="Required">*</abbr>
            </span>
            <input name="rate" type="number" min={500} step={100} required />
          </label>
          <label>
            Short description
            <textarea name="description" rows={2} placeholder="What this profile covers…" />
          </label>
          <fieldset className="form-fieldset">
            <legend>Lesson type</legend>
            <div className="checks">
              <label className="radio">
                <input name="online" type="checkbox" defaultChecked /> Online
              </label>
              <label className="radio">
                <input name="inPerson" type="checkbox" /> In person
              </label>
            </div>
          </fieldset>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-sm" type="submit">
              Publish subject profile
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {entitlement && !entitlement.canCreate ? (
            <div className="panel" style={{ marginTop: 0 }}>
              <p style={{ marginTop: 0 }}>{entitlement.createReason}</p>
              <Link className="btn btn-sm" href="/pricing">
                View Extra Profile Ads & Unlimited Profiles
              </Link>
            </div>
          ) : (
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => setShowCreate(true)}
              disabled={availableSubjects.length === 0}
            >
              Add subject profile
            </button>
          )}
          {availableSubjects.length === 0 && listings.length > 0 && (
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              Every catalog subject you selected already has a profile. Add more subjects on your
              account profile, then create another listing here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
