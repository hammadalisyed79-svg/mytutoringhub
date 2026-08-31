"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubscribeButton } from "@/components/SubscribeButton";
import { listingPath } from "@/lib/subject-profile";
import {
  teachingProfileSubjectChoices,
  teachingProfileTaxonomyLine,
  type TeachingProfileEditorValues,
} from "@/lib/teaching-profile-dashboard";
import {
  formatHourly,
  hourlyRateInputStep,
  hourlyRateInputToPkr,
  hourlyRateInputValue,
  minHourlyRateInput,
  formatMoney,
  type CurrencyCode,
} from "@/lib/currency";
import { scoreListingQuality } from "@/lib/listing-quality";
import { TeachingProfileDuplicateNotice } from "@/components/TeachingProfileDuplicateNotice";
import { TeachingProfileCapabilityFields } from "@/components/TeachingProfileCapabilityFields";
import { TutorBioAiHelp } from "@/components/TutorBioAiHelp";

const FEEDBACK_FLASH_KEY = "mth:tutor-ads-feedback";

type FeedbackFlash = { type: "ok" | "err"; text: string; at: number };

function peekFeedbackFlash(): FeedbackFlash | null {
  try {
    const raw = sessionStorage.getItem(FEEDBACK_FLASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedbackFlash;
    if (!parsed?.text || !parsed.at) return null;
    if (Date.now() - parsed.at > 8000) {
      sessionStorage.removeItem(FEEDBACK_FLASH_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeFeedbackFlash(type: "ok" | "err", text: string) {
  try {
    sessionStorage.setItem(
      FEEDBACK_FLASH_KEY,
      JSON.stringify({ type, text, at: Date.now() } satisfies FeedbackFlash),
    );
  } catch {
    /* ignore */
  }
}

function clearFeedbackFlash() {
  try {
    sessionStorage.removeItem(FEEDBACK_FLASH_KEY);
  } catch {
    /* ignore */
  }
}

type Listing = {
  id: string;
  subject: string;
  title: string;
  headline: string | null;
  level: string;
  board: string | null;
  qualification: string | null;
  syllabusCode: string | null;
  levels?: string[];
  boards?: string[];
  qualifications?: string[];
  syllabusCodes?: string[];
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

const EMPTY_CAPS: TeachingProfileEditorValues = {
  levels: [],
  boards: [],
  qualifications: [],
  syllabusCodes: [],
};

function TeachingDescriptionAiHelp({
  description,
  subject,
  caps,
  location = "",
  headline = "",
  hourlyRateLabel,
  online,
  inPerson,
  onApply,
}: {
  description: string;
  subject: string;
  caps: TeachingProfileEditorValues;
  location?: string;
  headline?: string;
  hourlyRateLabel?: string;
  online?: boolean;
  inPerson?: boolean;
  onApply: (text: string) => void;
}) {
  return (
    <TutorBioAiHelp
      purpose="teachingDescription"
      bio={description}
      name=""
      headline={headline}
      subjects={subject ? [subject] : []}
      location={location}
      country=""
      qualifications=""
      experienceYears={null}
      teachingMethod=""
      languages=""
      levels={caps.levels}
      expertise=""
      hourlyRateLabel={hourlyRateLabel}
      online={online}
      inPerson={inPerson}
      boards={caps.boards}
      qualificationStages={caps.qualifications}
      syllabusCodes={caps.syllabusCodes}
      onApply={onApply}
    />
  );
}

function listingEditorValues(listing: Listing): TeachingProfileEditorValues {
  if (listing.levels || listing.boards || listing.qualifications || listing.syllabusCodes) {
    return {
      levels: listing.levels || [],
      boards: listing.boards || [],
      qualifications: listing.qualifications || [],
      syllabusCodes: listing.syllabusCodes || [],
    };
  }
  return {
    levels: listing.level && listing.level !== "All levels" ? [listing.level] : [],
    boards: listing.board ? [listing.board] : [],
    qualifications: listing.qualification ? [listing.qualification] : [],
    syllabusCodes: listing.syllabusCode ? [listing.syllabusCode] : [],
  };
}

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

function EditTeachingProfileForm({
  listing,
  extraLevels,
  currency,
  rateMinLocal,
  rateStep,
  busy,
  onSave,
}: {
  listing: Listing;
  extraLevels: string[];
  currency: CurrencyCode;
  rateMinLocal: number;
  rateStep: number;
  busy: boolean;
  onSave: (e: React.FormEvent<HTMLFormElement>, caps: TeachingProfileEditorValues) => void;
}) {
  const [caps, setCaps] = useState(() => listingEditorValues(listing));
  const [description, setDescription] = useState(listing.description || "");
  const [rate, setRate] = useState(hourlyRateInputValue(listing.rate, currency));
  const [location, setLocation] = useState(listing.location);
  const [online, setOnline] = useState(listing.online);
  const [inPerson, setInPerson] = useState(listing.inPerson);
  return (
    <form
      className="stack-form profile-form teaching-listing-form"
      style={{ marginTop: "0.75rem" }}
      onSubmit={(e) => onSave(e, caps)}
    >
      <label>
        Profile title
        <input name="title" required minLength={5} defaultValue={listing.title} />
      </label>
      <label>
        Short headline
        <input name="headline" defaultValue={listing.headline || ""} />
      </label>
      <TeachingProfileCapabilityFields
        subject={listing.subject}
        extraLevels={extraLevels}
        values={caps}
        onChange={setCaps}
        compact
      />
      <label>
        City / area
        <input name="location" required value={location} onChange={(e) => setLocation(e.target.value)} />
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
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <span className="field-hint">
          Currently {formatHourly(listing.rate, currency)}. Min {formatMoney(rateMinLocal, currency)}.
        </span>
      </label>
      <fieldset className="form-fieldset">
        <legend>How you teach</legend>
        <div className="checks">
          <label className="radio">
            <input
              name="online"
              type="checkbox"
              checked={online}
              onChange={(e) => setOnline(e.target.checked)}
            />{" "}
            Online
          </label>
          <label className="radio">
            <input
              name="inPerson"
              type="checkbox"
              checked={inPerson}
              onChange={(e) => setInPerson(e.target.checked)}
            />{" "}
            In person
          </label>
        </div>
      </fieldset>
      <div className="tutor-bio-field">
        <label>
          Teaching description
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <TeachingDescriptionAiHelp
          description={description}
          subject={listing.subject}
          caps={caps}
          location={location}
          headline={listing.headline || ""}
          hourlyRateLabel={rate.trim() ? `${rate} ${currency}/hr` : formatHourly(listing.rate, currency)}
          online={online}
          inPerson={inPerson}
          onApply={setDescription}
        />
      </div>
      <button className="btn btn-sm" type="submit" disabled={busy}>
        Save changes
      </button>
    </form>
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
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [leftoverTags, setLeftoverTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createSubject, setCreateSubject] = useState("");
  const [createCaps, setCreateCaps] = useState<TeachingProfileEditorValues>(EMPTY_CAPS);
  const [createDescription, setCreateDescription] = useState("");
  const [createRate, setCreateRate] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createOnline, setCreateOnline] = useState(true);
  const [createInPerson, setCreateInPerson] = useState(false);

  const subjectChoices = useMemo(() => teachingProfileSubjectChoices(subjects), [subjects]);

  function load() {
    fetch("/api/tutor-ads")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setListings(d);
          setDuplicateNotice(null);
          setLeftoverTags([]);
          return;
        }
        if (Array.isArray(d?.listings)) setListings(d.listings);
        if (d?.entitlement) setEntitlement(d.entitlement);
        if (typeof d?.duplicateNotice === "string") setDuplicateNotice(d.duplicateNotice);
        else setDuplicateNotice(null);
        if (Array.isArray(d?.leftoverTags)) setLeftoverTags(d.leftoverTags.filter((t: unknown) => typeof t === "string"));
        else setLeftoverTags([]);
      })
      .catch(() => undefined);
  }

  function revealFeedback() {
    requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function clearFeedback() {
    setError("");
    setMsg("");
    clearFeedbackFlash();
  }

  function flashSuccess(text: string) {
    setError("");
    setMsg(text);
    writeFeedbackFlash("ok", text);
    revealFeedback();
  }

  function flashError(text: string) {
    setMsg("");
    setError(text);
    clearFeedbackFlash();
    revealFeedback();
  }

  useEffect(() => {
    load();
    const flash = peekFeedbackFlash();
    if (!flash) return;
    if (flash.type === "ok") setMsg(flash.text);
    else setError(flash.text);
    revealFeedback();
    const t = window.setTimeout(() => clearFeedbackFlash(), 600);
    return () => window.clearTimeout(t);
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearFeedback();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tutor-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: String(fd.get("subjectCustom") || fd.get("subject") || "").trim(),
        title: String(fd.get("title")),
        levels: createCaps.levels,
        boards: createCaps.boards,
        qualifications: createCaps.qualifications,
        syllabusCodes: createCaps.syllabusCodes,
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
      flashError(data.error || "Could not create Teaching Profile");
      return;
    }
    e.currentTarget.reset();
    setCreateSubject("");
    setCreateCaps(EMPTY_CAPS);
    setShowCreate(false);
    flashSuccess("Teaching Profile published — students can find it in search.");
    load();
    router.refresh();
  }

  async function saveEdit(
    e: React.FormEvent<HTMLFormElement>,
    id: string,
    caps: TeachingProfileEditorValues,
  ) {
    e.preventDefault();
    clearFeedback();
    setBusyId(id);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tutor-ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: String(fd.get("title")),
        headline: String(fd.get("headline") || ""),
        levels: caps.levels,
        boards: caps.boards,
        qualifications: caps.qualifications,
        syllabusCodes: caps.syllabusCodes,
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
      flashError(data.error || "Could not save");
      return;
    }
    setEditingId(null);
    flashSuccess("Teaching Profile updated.");
    load();
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    clearFeedback();
    setBusyId(id);
    const res = await fetch("/api/tutor-ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      flashError(data.error || "Could not update status");
      return;
    }
    flashSuccess(
      status === "PAUSED"
        ? "Teaching Profile paused — it is hidden from search."
        : "Teaching Profile reactivated — students can find it in search.",
    );
    load();
    router.refresh();
  }

  const freeCap = entitlement?.freeCapAfterPromo ?? 1;
  const paidCap = entitlement?.paidCap ?? 10;
  const capLabel = entitlement?.unlimited
    ? "Unlimited"
    : entitlement?.cap != null
      ? String(entitlement.cap)
      : "—";
  const activeCount =
    entitlement?.activeCount ?? listings.filter((l) => l.status === "ACTIVE").length;
  const capacityLine = entitlement?.unlimited
    ? "Legacy Unlimited — no active Teaching Profile limit. Boost does not add capacity."
    : `Free: ${freeCap} active Teaching Profile · Tutor Pro: up to ${paidCap} · Boost does not add capacity.`;
  const rateMinLocal = minHourlyRateInput(currency);
  const rateStep = hourlyRateInputStep(currency);

  function rateFromForm(fd: FormData) {
    return hourlyRateInputToPkr(Number(fd.get("rate")) || 0, currency);
  }

  function qualityBadgeClass(band: string) {
    if (band === "Strong") return "badge badge-verified";
    if (band === "Good") return "badge";
    return "badge badge-muted";
  }

  const createControls = showCreate ? (
    <form className="stack-form profile-form teaching-listing-form teaching-listing-create" onSubmit={create}>
      <h3 style={{ marginTop: 0 }}>Create Teaching Profile</h3>
      <p className="field-hint">
        One subject per profile. Put levels and boards inside it — not as extra rows.
      </p>
      <label>
        <span>
          Subject{" "}
          <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <select
          name="subject"
          value={createSubject}
          onChange={(e) => setCreateSubject(e.target.value)}
        >
          <option value="" disabled>
            What do you teach?
          </option>
          {subjectChoices.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Or type a subject
        <input
          name="subjectCustom"
          placeholder="e.g. Further Mathematics"
          onChange={(e) => {
            if (e.target.value.trim()) setCreateSubject(e.target.value);
          }}
        />
      </label>
      <label>
        <span>
          Profile title{" "}
          <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <input name="title" required minLength={5} placeholder="e.g. GCSE Maths · exam prep" />
      </label>
      <TeachingProfileCapabilityFields
        subject={createSubject}
        extraLevels={extraLevels}
        values={createCaps}
        onChange={setCreateCaps}
      />
      <label>
        <span>
          City / area{" "}
          <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <input
          name="location"
          required
          placeholder="City or Online"
          value={createLocation}
          onChange={(e) => setCreateLocation(e.target.value)}
        />
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
          value={createRate}
          onChange={(e) => setCreateRate(e.target.value)}
        />
        <span className="field-hint">Minimum {formatMoney(rateMinLocal, currency)}.</span>
      </label>
      <fieldset className="form-fieldset">
        <legend>How you teach</legend>
        <div className="checks">
          <label className="radio">
            <input
              name="online"
              type="checkbox"
              checked={createOnline}
              onChange={(e) => setCreateOnline(e.target.checked)}
            />{" "}
            Online
          </label>
          <label className="radio">
            <input
              name="inPerson"
              type="checkbox"
              checked={createInPerson}
              onChange={(e) => setCreateInPerson(e.target.checked)}
            />{" "}
            In person
          </label>
        </div>
      </fieldset>
      <div className="tutor-bio-field">
        <label>
          Teaching description
          <textarea
            name="description"
            rows={3}
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="Who this subject is for, how you teach it, and what results students can expect."
          />
        </label>
        <TeachingDescriptionAiHelp
          description={createDescription}
          subject={createSubject}
          caps={createCaps}
          location={createLocation}
          hourlyRateLabel={createRate.trim() ? `${createRate} ${currency}/hr` : undefined}
          online={createOnline}
          inPerson={createInPerson}
          onApply={setCreateDescription}
        />
      </div>
      <details className="profile-advanced-details">
        <summary>Optional — short headline</summary>
        <div className="profile-advanced-block">
          <label>
            Short headline
            <input name="headline" placeholder="Shown on search cards" />
          </label>
        </div>
      </details>
      <div className="teaching-listing-actions">
        <button className="btn btn-sm" type="submit">
          Publish Teaching Profile
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => {
            setShowCreate(false);
            setCreateCaps(EMPTY_CAPS);
            setCreateSubject("");
            setCreateDescription("");
            setCreateRate("");
            setCreateLocation("");
            setCreateOnline(true);
            setCreateInPerson(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  ) : (
    <div className="teaching-listings-toolbar">
      {entitlement && !entitlement.canCreate ? (
        <div className="panel teaching-listings-upgrade">
          <p>{entitlement.createReason}</p>
          <Link className="btn btn-sm" href="/pricing">
            View plans for more Teaching Profiles
          </Link>
        </div>
      ) : (
        <button className="btn btn-sm" type="button" onClick={() => setShowCreate(true)}>
          Add Teaching Profile
        </button>
      )}
      {subjectChoices.length === 0 && (
        <p className="muted teaching-listings-catalog-hint">
          Subject catalog still loading — you can type a subject when creating.
        </p>
      )}
    </div>
  );

  return (
    <div className="teaching-listings-manager" id="teaching-listings">
      <div className="teaching-listings-summary">
        <div className="teaching-listings-summary-copy">
          <p className="teaching-listings-capacity">{capacityLine}</p>
          <p className="teaching-listings-currency">
            Rates in <strong>{currency}</strong> · students see their local currency
          </p>
        </div>
        <p className="teaching-listings-meter" aria-label="Active Teaching Profiles">
          Active <strong>{activeCount}</strong>
          <span className="teaching-listings-meter-sep">/</span>
          <strong>{capLabel}</strong>
        </p>
      </div>

      <TeachingProfileDuplicateNotice message={duplicateNotice} />

      {leftoverTags.length > 0 && (
        <p className="field-hint teaching-listings-leftover" role="status">
          Old tags not yet profiles: {leftoverTags.join(", ")}. Add a Teaching Profile if you still
          teach them.
        </p>
      )}

      <details className="listing-quality-tips">
        <summary>Tips for stronger Teaching Profiles</summary>
        <ul>
          <li>Clear title students search for (e.g. “Cambridge O Level Chemistry 5070”).</li>
          <li>Put boards, levels, and syllabus codes on this one profile — not a second subject row.</li>
          <li>Set a subject-specific rate. Boost raises rank in matching search; it does not add capacity.</li>
        </ul>
      </details>

      {createControls}

      <div ref={feedbackRef} className="teaching-listings-feedback">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {msg && (
          <p className="success panel" role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="teaching-listings-list">
        {listings.length === 0 && !showCreate && (
          <div className="teaching-listings-empty">
            <p>No Teaching Profiles yet. Publish one so students can find you for that subject.</p>
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
          const quality = scoreListingQuality(listing);
          const taxonomy = teachingProfileTaxonomyLine(listing) || listing.subject;
          const modes =
            [listing.online ? "Online" : null, listing.inPerson ? "In person" : null]
              .filter(Boolean)
              .join(" · ") || "Lesson mode not set";
          return (
            <article
              key={listing.id}
              className={`teaching-listing-card${listing.status !== "ACTIVE" ? " is-paused" : ""}`}
            >
              <div className="teaching-listing-card-head">
                <div className="teaching-listing-card-main">
                  <strong className="teaching-listing-title">{listing.title}</strong>
                  <div className="teaching-listing-meta-row">
                    <span className="teaching-listing-subject">{taxonomy}</span>
                    <span className="teaching-listing-rate">{formatHourly(listing.rate, currency)}</span>
                  </div>
                  <div className="muted teaching-listing-meta">
                    {listing.location} · {modes}
                  </div>
                  {quality.tips[0] ? (
                    <p className="teaching-listing-quality-tip">{quality.tips[0]}</p>
                  ) : null}
                </div>
                <div className="teaching-listing-badges">
                  <span className={`badge${listing.status === "ACTIVE" ? " badge-verified" : " badge-muted"}`}>
                    {listing.status === "ACTIVE" ? "Active" : listing.status === "PAUSED" ? "Paused" : listing.status}
                  </span>
                  <span
                    className={qualityBadgeClass(quality.band)}
                    title={`Listing quality ${quality.score}/100`}
                  >
                    {quality.band} ({quality.score}/100)
                  </span>
                  {boosted && <span className="badge accent">Boosted</span>}
                  {highlighted && <span className="badge accent">Highlighted</span>}
                </div>
              </div>

              {(boosted || (boostUntil && boostUntil > now)) && (
                <p className="muted teaching-listing-boost-until">
                  Boost until {formatUntil(listing.boostUntil)}
                  {!boosted ? " (cycles periodically)" : ""}
                </p>
              )}

              <div className="teaching-listing-actions">
                <Link className="btn btn-secondary btn-sm" href={listingPath(listing.id)} target="_blank">
                  {listing.status === "ACTIVE" ? "View" : "Preview"}
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
                    label={boosted ? "Extend 30-Day Listing Boost" : "30-Day Listing Boost"}
                    featured
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                  />
                  <SubscribeButton
                    plan="AD_BOOST"
                    planLabel="Listing Boost (annual)"
                    currency={currency}
                    billing="annual"
                    label={
                      boosted
                        ? "Extend 365-Day Listing Boost (save 20%)"
                        : "365-Day Listing Boost (save 20%)"
                    }
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                  />
                </div>
              )}

              {editing && (
                <EditTeachingProfileForm
                  key={listing.id}
                  listing={listing}
                  extraLevels={extraLevels}
                  currency={currency}
                  rateMinLocal={rateMinLocal}
                  rateStep={rateStep}
                  busy={busyId === listing.id}
                  onSave={(e, caps) => saveEdit(e, listing.id, caps)}
                />
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
