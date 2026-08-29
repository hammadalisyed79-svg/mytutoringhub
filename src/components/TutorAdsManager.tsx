"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubscribeButton } from "@/components/SubscribeButton";
import { listingPath } from "@/lib/subject-profile";
import { tutorLevelOptions } from "@/lib/tutor-catalog";
import { curriculumBoards } from "@/lib/curriculum";
import {
  formatHourly,
  hourlyRateInputStep,
  hourlyRateInputToPkr,
  hourlyRateInputValue,
  MIN_HOURLY_RATE_PKR,
  minHourlyRateInput,
  formatMoney,
  type CurrencyCode,
} from "@/lib/currency";

type Listing = {
  id: string;
  subject: string;
  title: string;
  headline: string | null;
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
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

function ListingTaxonomyFields({
  levels,
  boards,
  defaults,
  compact = false,
}: {
  levels: string[];
  boards: string[];
  defaults?: {
    level?: string;
    board?: string | null;
    qualification?: string | null;
    syllabusCode?: string | null;
  };
  compact?: boolean;
}) {
  const core = (
    <label>
      Level
      <select name="level" defaultValue={defaults?.level || "All levels"}>
        {levels.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );

  const extras = (
    <>
      <label>
        Exam board <span className="muted">(optional)</span>
        <select name="board" defaultValue={defaults?.board || ""}>
          <option value="">Any / not specified</option>
          {boards.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Qualification <span className="muted">(optional)</span>
        <input
          name="qualification"
          placeholder="e.g. O Level, GCSE"
          defaultValue={defaults?.qualification || ""}
        />
      </label>
      <label>
        Syllabus code <span className="muted">(optional)</span>
        <input
          name="syllabusCode"
          placeholder="e.g. 5070"
          defaultValue={defaults?.syllabusCode || ""}
        />
      </label>
    </>
  );

  if (compact) {
    return (
      <>
        {core}
        <details className="profile-advanced-details">
          <summary>Optional — board &amp; syllabus</summary>
          <div className="teaching-listing-grid profile-advanced-block">{extras}</div>
        </details>
      </>
    );
  }

  return (
    <>
      <div className="teaching-listing-grid">
        {core}
        {extras}
      </div>
    </>
  );
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
        board: String(fd.get("board") || ""),
        qualification: String(fd.get("qualification") || ""),
        syllabusCode: String(fd.get("syllabusCode") || ""),
        location: String(fd.get("location")),
        rate: rateFromForm(fd),
        online: fd.get("online") === "on",
        inPerson: fd.get("inPerson") === "on",
        description: String(fd.get("description") || ""),
        headline: String(fd.get("headline") || ""),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create teaching listing");
      return;
    }
    setMsg("Teaching listing published.");
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
        board: String(fd.get("board") || ""),
        qualification: String(fd.get("qualification") || ""),
        syllabusCode: String(fd.get("syllabusCode") || ""),
        location: String(fd.get("location")),
        rate: rateFromForm(fd),
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
    setMsg("Teaching listing updated.");
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

  const boards = useMemo(() => curriculumBoards(), []);

  const capLabel = entitlement?.unlimited
    ? "Unlimited"
    : entitlement?.cap != null
      ? String(entitlement.cap)
      : "—";
  const rateMinLocal = minHourlyRateInput(currency);
  const rateStep = hourlyRateInputStep(currency);

  function rateFromForm(fd: FormData) {
    return hourlyRateInputToPkr(Number(fd.get("rate")) || 0, currency);
  }

  return (
    <div className="teaching-listings-manager" id="teaching-listings">
      <div className="teaching-listings-summary">
        <p className="muted" style={{ marginBottom: 0 }}>
          {entitlement?.promoLabel ||
            `After the launch promo: ${entitlement?.freeCapAfterPromo ?? 1} free active listing; Tutor Basic / Extra Profile Ads unlock up to ${entitlement?.paidCap ?? 3}; Unlimited Profiles removes the cap.`}
        </p>
        <p className="teaching-listings-meter">
          Active{" "}
          <strong>{entitlement?.activeCount ?? listings.filter((l) => l.status === "ACTIVE").length}</strong>
          {" / "}
          <strong>{capLabel}</strong>
        </p>
        <p className="field-hint" style={{ margin: "0.35rem 0 0" }}>
          Enter and review rates in <strong>{currency}</strong>. We store PKR as the site base so
          students worldwide see their own currency.
        </p>
      </div>

      {listings.length > 0 && (
        <div className="listing-quality-tips">
          <p className="listing-quality-title">Make listings easier to find</p>
          <ul>
            <li>Use a clear title students would search for (e.g. “Cambridge O Level Chemistry 5070”).</li>
            <li>Add exam board and syllabus code when relevant — Past Paper visitors match on these.</li>
            <li>Set a listing-specific rate; different levels can charge different prices.</li>
            <li>Boost only the listings you want at the top of search — payment never overrides subject relevance.</li>
          </ul>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="teaching-listings-list">
        {listings.length === 0 && (
          <div className="teaching-listings-empty">
            <p style={{ margin: 0 }}>
              No teaching listings yet. Add what you teach — subject, level, and rate — so students
              searching for that exact need can find you.
            </p>
          </div>
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
          const taxonomy = [
            listing.subject,
            listing.board,
            listing.qualification || listing.level,
            listing.syllabusCode,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <article
              key={listing.id}
              className={`teaching-listing-card${listing.status !== "ACTIVE" ? " is-paused" : ""}`}
            >
              <div className="teaching-listing-card-head">
                <div>
                  <strong className="teaching-listing-title">{listing.title}</strong>
                  <div className="muted teaching-listing-meta">
                    {taxonomy} · {listing.location} · {formatHourly(listing.rate, currency)}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    {[listing.online ? "Online" : null, listing.inPerson ? "In person" : null]
                      .filter(Boolean)
                      .join(" · ") || "Lesson mode not set"}
                  </div>
                </div>
                <div className="teaching-listing-badges">
                  <span className={`badge${listing.status === "ACTIVE" ? " badge-verified" : ""}`}>
                    {listing.status === "ACTIVE" ? "Active" : listing.status}
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

              <div className="teaching-listing-actions">
                <Link className="btn btn-secondary btn-sm" href={listingPath(listing.id)} target="_blank">
                  {listing.status === "ACTIVE" ? "View listing page" : "Preview listing"}
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
                <div className="teaching-listing-boost-row">
                  <SubscribeButton
                    plan="AD_BOOST"
                    planLabel="Listing Boost"
                    currency={currency}
                    label={boosted ? "Extend boost 30 days" : "Boost this listing"}
                    featured
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                  />
                  <SubscribeButton
                    plan="HIGHLIGHTED_AD"
                    planLabel="Highlighted Listing"
                    currency={currency}
                    label={highlighted ? "Extend highlight" : "Highlight this listing"}
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                  />
                </div>
              )}

              {editing && (
                <form
                  className="stack-form profile-form teaching-listing-form"
                  style={{ marginTop: "0.75rem" }}
                  onSubmit={(e) => saveEdit(e, listing.id)}
                >
                  <label>
                    Listing title
                    <input name="title" required minLength={5} defaultValue={listing.title} />
                  </label>
                  <label>
                    Short headline
                    <input name="headline" defaultValue={listing.headline || ""} />
                  </label>
                  <ListingTaxonomyFields
                    levels={levels}
                    boards={boards}
                    defaults={{
                      level: listing.level,
                      board: listing.board,
                      qualification: listing.qualification,
                      syllabusCode: listing.syllabusCode,
                    }}
                    compact
                  />
                  <label>
                    City / area
                    <input name="location" required defaultValue={listing.location} />
                  </label>
                  <label>
                    Hourly rate ({currency})
                    <input
                      name="rate"
                      type="number"
                      min={rateMinLocal}
                      step={rateStep}
                      inputMode="decimal"
                      required
                      defaultValue={hourlyRateInputValue(listing.rate, currency)}
                    />
                    <span className="field-hint">
                      Currently {formatHourly(listing.rate, currency)}. Minimum{" "}
                      {formatMoney(rateMinLocal, currency)} ({MIN_HOURLY_RATE_PKR} PKR base).
                    </span>
                  </label>
                  <label>
                    About this lesson
                    <textarea name="description" rows={3} defaultValue={listing.description || ""} />
                  </label>
                  <fieldset className="form-fieldset">
                    <legend>How you teach</legend>
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
        <form
          className="stack-form profile-form teaching-listing-form"
          onSubmit={create}
          style={{ marginTop: "1rem" }}
        >
          <h3 style={{ marginTop: 0 }}>Add teaching listing</h3>
          <p className="field-hint">
            One subject service per listing — students search these like FindTutors ads.
          </p>
          <label>
            <span>
              Subject <abbr className="req" title="Required">
                *
              </abbr>
            </span>
            <select name="subject" required defaultValue="">
              <option value="" disabled>
                What do you teach?
              </option>
              {subjects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              Listing title <abbr className="req" title="Required">
                *
              </abbr>
            </span>
            <input
              name="title"
              required
              minLength={5}
              placeholder="e.g. GCSE Maths · exam prep"
            />
          </label>
          <ListingTaxonomyFields levels={levels} boards={boards} compact />
          <label>
            <span>
              City / area <abbr className="req" title="Required">
                *
              </abbr>
            </span>
            <input name="location" required placeholder="City or Online" />
          </label>
          <label>
            <span>
              Hourly rate ({currency}){" "}
              <abbr className="req" title="Required">
                *
              </abbr>
            </span>
            <input
              name="rate"
              type="number"
              min={rateMinLocal}
              step={rateStep}
              inputMode="decimal"
              required
              placeholder={hourlyRateInputValue(1500, currency)}
            />
            <span className="field-hint">
              Minimum {formatMoney(rateMinLocal, currency)}.
            </span>
          </label>
          <fieldset className="form-fieldset">
            <legend>How you teach</legend>
            <div className="checks">
              <label className="radio">
                <input name="online" type="checkbox" defaultChecked /> Online
              </label>
              <label className="radio">
                <input name="inPerson" type="checkbox" /> In person
              </label>
            </div>
          </fieldset>
          <details className="profile-advanced-details">
            <summary>Optional — headline &amp; description</summary>
            <div className="profile-advanced-block">
              <label>
                Short headline
                <input name="headline" placeholder="Shown on search cards" />
              </label>
              <label>
                About this lesson
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Who it is for and how you teach…"
                />
              </label>
            </div>
          </details>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-sm" type="submit">
              Publish listing
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {entitlement && !entitlement.canCreate ? (
            <div className="panel teaching-listings-upgrade" style={{ marginTop: 0 }}>
              <p style={{ marginTop: 0 }}>{entitlement.createReason}</p>
              <Link className="btn btn-sm" href="/pricing">
                View plans for more listings
              </Link>
            </div>
          ) : (
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => setShowCreate(true)}
              disabled={subjects.length === 0}
            >
              Add teaching listing
            </button>
          )}
          {subjects.length === 0 && (
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              Add subjects on your account profile first, then create a teaching listing for each
              service you offer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
