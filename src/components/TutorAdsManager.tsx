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
  formatPlanPrice,
  type CurrencyCode,
} from "@/lib/currency";
import { scoreListingQuality } from "@/lib/listing-quality";
import { TeachingProfileDuplicateNotice } from "@/components/TeachingProfileDuplicateNotice";
import { TeachingProfileCapabilityFields } from "@/components/TeachingProfileCapabilityFields";
import { TutorBioAiHelp } from "@/components/TutorBioAiHelp";
import { SuggestField } from "@/components/SuggestField";
import { fireConversionEvent } from "@/components/ConversionBeacon";
import { UPGRADE_FOR_MORE_PROFILES_MESSAGE } from "@/lib/teaching-profile-cap";
import { suggestSubjects } from "@/lib/search-smart";

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
  extraActiveSlots?: number;
  extraActiveMax?: number;
  canBuyExtraActive?: boolean;
  canCreate: boolean;
  createReason: string | null;
  createPaused?: boolean;
  canActivate?: boolean;
  activateReason?: string | null;
  upgradeRequired?: boolean;
  upgradeMessage?: string | null;
};

const EMPTY_CAPS: TeachingProfileEditorValues = {
  levels: [],
  boards: [],
  qualifications: [],
  syllabusCodes: [],
};

function CapacityUpgradeActions({
  currency,
  paidCheckoutLive,
  canBuyExtraActive = true,
  secondaryHref = "/pricing?plan=TUTOR_BASIC",
  secondaryLabel = "Compare plans",
  returnUrl = "/dashboard/tutor?tab=profile#teaching-listings",
}: {
  currency: CurrencyCode;
  paidCheckoutLive: boolean;
  canBuyExtraActive?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
  returnUrl?: string;
}) {
  void canBuyExtraActive;
  return (
    <div className="teaching-listings-upgrade-actions">
      <SubscribeButton
        plan="TUTOR_BASIC"
        planLabel="Tutor Pro"
        currency={currency}
        label="Activate Tutor Pro"
        featured
        paidCheckoutLive={paidCheckoutLive}
        returnUrl={returnUrl}
        trigger="teaching_profile_limit"
        sourcePage="teaching_profiles"
      />
      <Link className="btn btn-sm btn-secondary" href={secondaryHref}>
        {secondaryLabel}
      </Link>
    </div>
  );
}

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

/** Paid Listing Boost window still running (purchase entitlement). */
function hasListingBoostWindow(boostUntil: Date | null, now: Date) {
  return Boolean(boostUntil && boostUntil > now);
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
      <p className="muted field-hint" style={{ margin: "0.35rem 0 0" }}>
        Saves this Teaching Profile only.
      </p>
    </form>
  );
}

export function TutorAdsManager({
  subjects,
  extraLevels = [],
  currency = "USD",
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
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [createSubject, setCreateSubject] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createHeadline, setCreateHeadline] = useState("");
  const [createCaps, setCreateCaps] = useState<TeachingProfileEditorValues>(EMPTY_CAPS);
  const [createDescription, setCreateDescription] = useState("");
  const [createRate, setCreateRate] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createOnline, setCreateOnline] = useState(true);
  const [createInPerson, setCreateInPerson] = useState(false);

  const subjectChoices = useMemo(() => teachingProfileSubjectChoices(subjects), [subjects]);
  const subjectSuggestOptions = useMemo(() => {
    const ranked = suggestSubjects(createSubject, subjectChoices, 12);
    const needle = createSubject.trim().toLowerCase();
    const exact = needle
      ? subjectChoices.filter((name) => name.toLowerCase().includes(needle)).slice(0, 12)
      : subjectChoices.slice(0, 12);
    const merged = [...ranked];
    for (const name of exact) {
      if (!merged.some((row) => row.toLowerCase() === name.toLowerCase())) merged.push(name);
    }
    return merged.slice(0, 12).map((name) => ({ value: name, label: name }));
  }, [createSubject, subjectChoices]);

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

  async function create(opts?: { skipOptional?: boolean }) {
    clearFeedback();
    const subject = createSubject.trim();
    const title = createTitle.trim();
    if (!subject) {
      flashError("Choose or type a subject.");
      setCreateStep(0);
      return;
    }
    if (title.length < 5) {
      flashError("Profile title needs at least 5 characters.");
      setCreateStep(0);
      return;
    }
    if (!createLocation.trim()) {
      flashError("Add a city or Online.");
      setCreateStep(0);
      return;
    }
    const ratePkr = hourlyRateInputToPkr(Number(createRate) || 0, currency);
    if (!createRate.trim() || Number(createRate) < rateMinLocal) {
      flashError(`Hourly rate must be at least ${formatMoney(rateMinLocal, currency)}.`);
      setCreateStep(0);
      return;
    }
    if (!createOnline && !createInPerson) {
      flashError("Choose online, in person, or both.");
      setCreateStep(0);
      return;
    }
    const res = await fetch("/api/tutor-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        title,
        levels: createCaps.levels,
        boards: createCaps.boards,
        qualifications: createCaps.qualifications,
        syllabusCodes: createCaps.syllabusCodes,
        location: createLocation.trim(),
        rate: ratePkr,
        online: createOnline,
        inPerson: createInPerson,
        description: opts?.skipOptional ? "" : createDescription,
        headline: opts?.skipOptional ? "" : createHeadline,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flashError(data.error || UPGRADE_FOR_MORE_PROFILES_MESSAGE);
      if (data.code === "UPGRADE_REQUIRED" || data.upgradeRequired) {
        setUpgradeNotice(data.error || UPGRADE_FOR_MORE_PROFILES_MESSAGE);
      }
      return;
    }
    resetCreateForm();
    if (data.id && !data.createdPaused) {
      fireConversionEvent(
        "teaching_profile_activated",
        { listingId: data.id, subject },
        `tp_active_${data.id}`,
      );
    }
    flashSuccess(
      data.createdPaused
        ? "Teaching Profile saved as Paused. Upgrade to Tutor Pro to run more live in search."
        : "Teaching Profile published — students can find it in search.",
    );
    if (data.createdPaused) {
      setUpgradeNotice(entitlement?.upgradeMessage || UPGRADE_FOR_MORE_PROFILES_MESSAGE);
    }
    load();
    router.refresh();
  }

  function resetCreateForm() {
    setShowCreate(false);
    setCreateStep(0);
    setCreateSubject("");
    setCreateTitle("");
    setCreateHeadline("");
    setCreateCaps(EMPTY_CAPS);
    setCreateDescription("");
    setCreateRate("");
    setCreateLocation("");
    setCreateOnline(true);
    setCreateInPerson(false);
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
      if (
        data.code === "UPGRADE_REQUIRED" ||
        data.code === "SWITCH_LIMIT" ||
        data.upgradeRequired
      ) {
        setUpgradeNotice(data.error || UPGRADE_FOR_MORE_PROFILES_MESSAGE);
      }
      return;
    }
    setUpgradeNotice(null);
    flashSuccess(
      status === "PAUSED"
        ? "Teaching Profile paused — it is hidden from search."
        : "Teaching Profile reactivated — students can find it in search.",
    );
    load();
    router.refresh();
  }

  async function deleteListing() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    clearFeedback();
    setBusyId(id);
    const res = await fetch(`/api/tutor-ads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      flashError((data as { error?: string }).error || "Could not delete Teaching Profile.");
      return;
    }
    setDeleteTarget(null);
    if (editingId === id) setEditingId(null);
    flashSuccess("Teaching Profile deleted.");
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
    ? "Unlimited live slots (legacy)."
    : `Free ${freeCap} live · Pro up to ${paidCap}`;
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

  const CREATE_STEPS = [
    { id: "essentials", title: "Subject & rate", optional: false },
    { id: "copy", title: "Description", optional: true },
  ] as const;

  function advanceCreateFromEssentials() {
    clearFeedback();
    if (!createSubject.trim()) {
      flashError("Choose or type a subject.");
      return;
    }
    if (createTitle.trim().length < 5) {
      flashError("Profile title needs at least 5 characters.");
      return;
    }
    if (!createLocation.trim()) {
      flashError("Add a city or Online.");
      return;
    }
    if (!createRate.trim() || Number(createRate) < rateMinLocal) {
      flashError(`Hourly rate must be at least ${formatMoney(rateMinLocal, currency)}.`);
      return;
    }
    if (!createOnline && !createInPerson) {
      flashError("Choose online, in person, or both.");
      return;
    }
    setCreateStep(1);
  }

  const createStepMeta = CREATE_STEPS[createStep] || CREATE_STEPS[0];

  const createControls = showCreate ? (
    <form
      className="stack-form profile-form teaching-listing-form teaching-listing-create"
      onSubmit={(e) => {
        e.preventDefault();
        if (createStep === 0) {
          advanceCreateFromEssentials();
          return;
        }
        void create();
      }}
    >
      <h3 style={{ marginTop: 0 }}>Create Teaching Profile</h3>
      <p className="muted guided-search-step">
        Step {createStep + 1} of {CREATE_STEPS.length} · {createStepMeta.title}
        {createStepMeta.optional ? " (optional)" : ""}
      </p>
      <p className="field-hint">One subject per profile. Students find you by subject and rate.</p>

      {createStep === 0 ? (
        <>
          <SuggestField
            name="subject"
            label="Subject"
            required
            value={createSubject}
            onChange={setCreateSubject}
            options={subjectSuggestOptions}
            placeholder="Type to search — e.g. Maths, Chemistry"
          />
          <p className="field-hint">
            Start typing to filter the catalog. You can also enter a subject that is not listed.
          </p>
          <label>
            <span>
              Profile title{" "}
              <abbr className="req" title="Required">
                *
              </abbr>
            </span>
            <input
              name="title"
              required
              minLength={5}
              placeholder="e.g. GCSE Maths · exam prep"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
            />
          </label>
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
          <TeachingProfileCapabilityFields
            subject={createSubject}
            extraLevels={extraLevels}
            values={createCaps}
            onChange={setCreateCaps}
            compact
          />
        </>
      ) : null}

      {createStep === 1 ? (
        <>
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
          <label>
            Short headline
            <input
              name="headline"
              placeholder="Shown on search cards"
              value={createHeadline}
              onChange={(e) => setCreateHeadline(e.target.value)}
            />
          </label>
        </>
      ) : null}

      <div className="teaching-listing-actions">
        {createStep > 0 ? (
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => {
              clearFeedback();
              setCreateStep((s) => Math.max(0, s - 1));
            }}
          >
            Back
          </button>
        ) : (
          <button className="btn btn-secondary btn-sm" type="button" onClick={resetCreateForm}>
            Cancel
          </button>
        )}
        {createStep === 1 ? (
          <>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => void create({ skipOptional: true })}
            >
              Skip for now
            </button>
            <button className="btn btn-sm" type="submit">
              Save &amp; publish
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => void create({ skipOptional: true })}
            >
              Save essentials now
            </button>
            <button className="btn btn-sm" type="submit">
              Save &amp; next
            </button>
          </>
        )}
      </div>
    </form>
  ) : (
    <div className="teaching-listings-toolbar">
      {entitlement?.upgradeRequired || upgradeNotice ? (
        <div className="panel teaching-listings-upgrade" role="status">
          <p>{upgradeNotice || entitlement?.upgradeMessage || UPGRADE_FOR_MORE_PROFILES_MESSAGE}</p>
          <CapacityUpgradeActions
            currency={currency}
            paidCheckoutLive={paidCheckoutLive}
            canBuyExtraActive={entitlement?.canBuyExtraActive !== false}
          />
        </div>
      ) : null}
      {entitlement && !entitlement.canCreate ? (
        <div className="panel teaching-listings-upgrade">
          <p>{entitlement.createReason}</p>
          <CapacityUpgradeActions
            currency={currency}
            paidCheckoutLive={paidCheckoutLive}
            canBuyExtraActive={Boolean(entitlement.canBuyExtraActive)}
            secondaryHref="/pricing?plan=TUTOR_BASIC"
            secondaryLabel="View plans"
          />
        </div>
      ) : (
        <>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => {
              setCreateStep(0);
              setShowCreate(true);
            }}
          >
            Add Teaching Profile
          </button>
          {entitlement?.createPaused ? (
            <p className="muted teaching-listings-catalog-hint">
              At your active limit — new subjects save as Paused.{" "}
              <Link href="/pricing?plan=TUTOR_BASIC">View Tutor Pro</Link> to run more live.
            </p>
          ) : null}
        </>
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
          <p className="teaching-listings-currency">Rates in {currency}</p>
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
          Still need profiles for: {leftoverTags.join(", ")}.
        </p>
      )}

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
            <p>No subjects live yet — add one to appear in search.</p>
          </div>
        )}
        {listings.map((listing) => {
          const now = new Date();
          const boostUntil = listing.boostUntil ? new Date(listing.boostUntil) : null;
          const highlightUntil = listing.highlightedUntil
            ? new Date(listing.highlightedUntil)
            : null;
          const boostWindowActive = hasListingBoostWindow(boostUntil, now);
          const boostUntilLabel = formatUntil(listing.boostUntil);
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
                  {boostWindowActive && <span className="badge accent">Boosted</span>}
                  {highlighted && <span className="badge accent">Highlighted</span>}
                </div>
              </div>

              {boostWindowActive && boostUntilLabel ? (
                <p className="muted teaching-listing-boost-until" role="status">
                  Boosted until <strong>{boostUntilLabel}</strong>
                </p>
              ) : null}

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
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={busyId === listing.id}
                  onClick={() =>
                    setDeleteTarget({ id: listing.id, title: listing.title || listing.subject })
                  }
                >
                  Delete
                </button>
              </div>

              {listing.status !== "ACTIVE" && entitlement?.upgradeRequired ? (
                <p className="muted teaching-listings-catalog-hint" role="status">
                  At your active limit.{" "}
                  <Link href="/pricing?plan=TUTOR_BASIC">View Tutor Pro</Link> to activate this
                  profile — or use the upgrade options above.
                </p>
              ) : null}

              {listing.status === "ACTIVE" && (
                <div className="teaching-listing-boost-row">
                  <SubscribeButton
                    plan="AD_BOOST"
                    planLabel="Listing Boost"
                    currency={currency}
                    label={
                      boostWindowActive
                        ? `Extend 30-Day Listing Boost · ${formatPlanPrice(999, currency, "once")}`
                        : `30-Day Listing Boost · ${formatPlanPrice(999, currency, "once")}`
                    }
                    featured
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                    returnUrl={`/dashboard/tutor?tab=profile&listing=${encodeURIComponent(listing.id)}#teaching-listings`}
                    trigger="listing_boost"
                    sourcePage="teaching_profiles"
                  />
                  <SubscribeButton
                    plan="AD_BOOST"
                    planLabel="Listing Boost (annual)"
                    currency={currency}
                    billing="annual"
                    label={
                      boostWindowActive
                        ? "Extend 365-Day Listing Boost · save 20%"
                        : "365-Day Listing Boost · One-time · save 20%"
                    }
                    oneTime
                    paidCheckoutLive={paidCheckoutLive}
                    subjectProfileId={listing.id}
                    returnUrl={`/dashboard/tutor?tab=profile&listing=${encodeURIComponent(listing.id)}#teaching-listings`}
                    trigger="listing_boost"
                    sourcePage="teaching_profiles"
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

      {deleteTarget ? (
        <div
          className="teaching-listing-delete-overlay"
          role="presentation"
          onClick={() => {
            if (busyId !== deleteTarget.id) setDeleteTarget(null);
          }}
        >
          <div
            className="panel teaching-listing-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-tp-title"
            aria-describedby="delete-tp-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-tp-title">Delete Teaching Profile?</h3>
            <p id="delete-tp-desc">
              You are about to delete <strong>{deleteTarget.title}</strong>. This cannot be undone —
              the profile is removed from search and <strong>no record will be saved</strong> for recovery.
            </p>
            <div className="teaching-listing-delete-actions">
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={() => void deleteListing()}
              >
                {busyId === deleteTarget.id ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
