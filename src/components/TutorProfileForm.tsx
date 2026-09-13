"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PhotoFrameAdjust } from "@/components/PhotoFrameAdjust";
import { countryByName } from "@/lib/markets";
import {
  citiesForCountry,
  inferTutorCountry,
  joinCsv,
  splitCsv,
  tutorCountries,
} from "@/lib/tutor-catalog";
import {
  parseAvailability,
  serializeAvailability,
  type AvailabilitySlot,
} from "@/lib/availability";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";
import { TutorBioAiHelp } from "@/components/TutorBioAiHelp";
import {
  TUTOR_WIZARD_STEP_IDS,
  type TutorWizardStepId,
} from "@/lib/tutor-wizard";
import {
  currencyFromCountry,
  DEFAULT_HOURLY_RATE_PKR,
  hourlyRateInputToPkr,
  hourlyRateInputValue,
  MIN_HOURLY_RATE_PKR,
  type CurrencyCode,
} from "@/lib/currency";

type Initial = {
  headline?: string | null;
  bio: string;
  subjects: string;
  hourlyRate: number;
  location: string;
  country?: string | null;
  expertise?: string | null;
  online: boolean;
  inPerson: boolean;
  photoUrl?: string | null;
  photoCropX?: number | null;
  photoCropY?: number | null;
  photoCropZoom?: number | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  teachingMethod?: string | null;
  languages?: string | null;
  levels?: string | null;
  availability?: string | null;
  videoUrl?: string | null;
  introVideoUrl?: string | null;
  offersFreeTrial?: boolean;
  phone?: string | null;
};

const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const WIZARD_STEP_META: Record<TutorWizardStepId, { title: string; hint: string }> = {
  photo: {
    title: "Profile photo",
    hint: "Upload a clear photo of yourself.",
  },
  basics: {
    title: "About you",
    hint: "Your name and a short introduction for students.",
  },
  place: {
    title: "Location",
    hint: "Country and city for search.",
  },
  teaching: {
    title: "Qualifications",
    hint: "Your highest qualification and default lesson type.",
  },
  finish: {
    title: "Save setup",
    hint: "Save your tutor profile, then continue to Teaching Profiles.",
  },
};

const WIZARD_STEPS = TUTOR_WIZARD_STEP_IDS.map((id) => ({
  id,
  ...WIZARD_STEP_META[id],
  optional: false as const,
}));

function photoExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function validatePhotoFile(file: File): string | null {
  if (file.size > PHOTO_MAX_BYTES) {
    return "Photo must be under 2 MB.";
  }
  const ext = photoExt(file.name);
  if (ext === "heic" || ext === "heif") {
    return "HEIC photos aren't supported. Save as JPEG or PNG and try again.";
  }
  const mime = file.type.toLowerCase();
  if (mime && PHOTO_MIMES.has(mime)) return null;
  if (ext && PHOTO_EXTENSIONS.has(ext)) return null;
  return "Use JPEG, PNG, WebP, or GIF.";
}

async function parseUploadResponse(
  res: Response,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  let data: { error?: string; url?: string } | null = null;
  try {
    data = await res.json();
  } catch {
    if (res.status === 503) {
      return {
        ok: false,
        error: "Photo uploads aren't available right now (storage not configured). Paste a photo link below.",
      };
    }
    return { ok: false, error: `Upload failed (${res.status}). Try again or paste a photo link.` };
  }
  if (!res.ok) {
    if (res.status === 503) {
      return {
        ok: false,
        error: "Photo uploads aren't available right now (storage not configured). Paste a photo link below.",
      };
    }
    return { ok: false, error: data?.error || `Upload failed (${res.status}).` };
  }
  if (!data?.url) {
    return { ok: false, error: "Upload succeeded but no URL was returned." };
  }
  return { ok: true, url: data.url };
}

export function TutorProfileForm({
  initial,
  displayName,
  subjects: _catalogSubjects,
  emailVerified = true,
  listingActive = false,
  startStep,
  currency = "PKR",
  hasValidTeachingProfile = false,
  hasAnyTeachingProfile = false,
  onSetupComplete,
}: {
  initial: Initial;
  displayName: string;
  subjects: string[];
  extraLevels?: string[];
  emailVerified?: boolean;
  /** Whether the listing is currently public (DB active flag). */
  listingActive?: boolean;
  verified?: boolean;
  /** Jump to a setup step. */
  startStep?: TutorWizardStepId;
  /** Visitor/tutor location currency for rate entry (stored as PKR). */
  currency?: CurrencyCode;
  /** Has an ACTIVE Teaching Profile (in search). */
  hasValidTeachingProfile?: boolean;
  /** Has any Teaching Profile row (active or paused). */
  hasAnyTeachingProfile?: boolean;
  /** After setup save — advance workspace to Teaching Profiles. */
  onSetupComplete?: () => void;
}) {
  const router = useRouter();
  const { update } = useSession();
  const photoInput = useRef<HTMLInputElement>(null);
  const countries = useMemo(() => tutorCountries(), []);
  const [country, setCountry] = useState(inferTutorCountry(initial.location, initial.country));

  /** Rate currency follows teaching country (Germany → EUR); falls back to visitor currency. */
  const rateCurrency = useMemo(() => {
    const code = countryByName(country)?.code;
    return code ? currencyFromCountry(code) : currency;
  }, [country, currency]);

  const rateCurrencyRef = useRef(rateCurrency);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const manageProfilesOnly = hasAnyTeachingProfile || hasValidTeachingProfile;
  const steps = useMemo(() => {
    return WIZARD_STEPS.map((row) => {
      if (row.id !== "finish") return row;
      if (manageProfilesOnly) {
        return {
          ...row,
          title: "Save setup",
          hint: hasValidTeachingProfile
            ? "Profile ready — continue to manage Teaching Profiles."
            : "Save, then add or activate a Teaching Profile next.",
        };
      }
      return {
        ...row,
        hint: "Save setup, then add your first Teaching Profile in the next block.",
      };
    });
  }, [manageProfilesOnly, hasValidTeachingProfile]);
  const initialStepIndex = Math.max(
    0,
    startStep && (TUTOR_WIZARD_STEP_IDS as readonly string[]).includes(startStep)
      ? steps.findIndex((row) => row.id === startStep)
      : 0,
  );
  const [step, setStep] = useState(initialStepIndex >= 0 ? initialStepIndex : 0);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl || "");
  const [photoCropX, setPhotoCropX] = useState(initial.photoCropX ?? 0);
  const [photoCropY, setPhotoCropY] = useState(initial.photoCropY ?? 0);
  const [photoCropZoom, setPhotoCropZoom] = useState(initial.photoCropZoom ?? 1);
  const [uploading, setUploading] = useState(false);
  const [headline, setHeadline] = useState(initial.headline || "");
  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(initial.bio || "");
  const [subjectList] = useState(splitCsv(initial.subjects));
  const [expertiseList, setExpertiseList] = useState(splitCsv(initial.expertise));
  const [levelList, setLevelList] = useState(splitCsv(initial.levels));
  const [languageList, setLanguageList] = useState(splitCsv(initial.languages));
  const [location, setLocation] = useState(initial.location || "");
  const [hourlyRate, setHourlyRate] = useState(
    hourlyRateInputValue(initial.hourlyRate || DEFAULT_HOURLY_RATE_PKR, rateCurrency),
  );
  const [online, setOnline] = useState(initial.online);
  const [inPerson, setInPerson] = useState(initial.inPerson);
  const [qualifications, setQualifications] = useState(initial.qualifications || "");
  const [experienceYears, setExperienceYears] = useState(
    initial.experienceYears == null ? "" : String(initial.experienceYears),
  );
  const [teachingMethod, setTeachingMethod] = useState(initial.teachingMethod || "");
  const [slots, setSlots] = useState<AvailabilitySlot[]>(() => parseAvailability(initial.availability));
  const [videoUrl] = useState(initial.videoUrl || "");
  const [introVideoUrl, setIntroVideoUrl] = useState(initial.introVideoUrl || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [offersFreeTrial, setOffersFreeTrial] = useState(Boolean(initial.offersFreeTrial));
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  // Keep the typed amount consistent when teaching country (hence currency) changes.
  useEffect(() => {
    if (rateCurrencyRef.current === rateCurrency) return;
    const previous = rateCurrencyRef.current;
    const asPkr = hourlyRateInputToPkr(Number(hourlyRate) || 0, previous);
    rateCurrencyRef.current = rateCurrency;
    setHourlyRate(hourlyRateInputValue(asPkr || DEFAULT_HOURLY_RATE_PKR, rateCurrency));
    // Only re-base when currency changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateCurrency]);

  const cities = useMemo(() => citiesForCountry(country), [country]);

  const ratePkr = hourlyRateInputToPkr(Number(hourlyRate) || 0, rateCurrency);

  const firstProfileReady = hasValidTeachingProfile;

  const completion = useMemo(
    () =>
      getTutorProfileCompletion({
        name,
        photoUrl,
        headline,
        bio,
        country,
        location,
        subjects: joinCsv(subjectList),
        hourlyRate: ratePkr,
        online,
        inPerson,
        qualifications,
        hasValidTeachingProfile: firstProfileReady,
        hasValidListingRate: firstProfileReady,
        hasAnyTeachingProfile: manageProfilesOnly,
      }),
    [
      name,
      photoUrl,
      headline,
      bio,
      country,
      location,
      subjectList,
      ratePkr,
      online,
      inPerson,
      qualifications,
      firstProfileReady,
      manageProfilesOnly,
    ],
  );

  const currentStep = steps[Math.min(step, steps.length - 1)];

  function validateStep(stepId: TutorWizardStepId): string | null {
    switch (stepId) {
      case "photo":
        if (!photoUrl.startsWith("https://")) return "Upload a profile photo to continue.";
        return null;
      case "basics": {
        if (name.trim().length < 2) return "Enter the name students see (at least 2 characters).";
        if (bio.trim().length < 40) return "Write at least 40 characters about your teaching.";
        if (headline.trim().length < 8) {
          const auto = `${name.trim()} · Private tutor`.slice(0, 120);
          setHeadline(auto);
        }
        return null;
      }
      case "place":
        if (!country) return "Select the country you teach from.";
        if (!location.trim()) return "Select a city.";
        return null;
      case "teaching":
        if (!online && !inPerson) return "Choose online, in person, or both.";
        if (!qualifications.trim()) return "Add your highest qualification.";
        return null;
      case "finish":
        return null;
      default:
        return null;
    }
  }

  /** True only when the step’s data is actually filled — not merely visited. */
  function isStepDataComplete(stepId: TutorWizardStepId): boolean {
    switch (stepId) {
      case "photo":
        return photoUrl.startsWith("https://");
      case "basics":
        return name.trim().length >= 2 && bio.trim().length >= 40;
      case "place":
        return Boolean(country?.trim() && location.trim());
      case "teaching":
        return (online || inPerson) && Boolean(qualifications.trim());
      case "finish":
        return manageProfilesOnly;
      default:
        return false;
    }
  }

  function stepStatus(stepId: TutorWizardStepId, index: number) {
    const active = index === step;
    const complete = isStepDataComplete(stepId);
    const pending = !complete && !active && index < step;
    const upcoming = !complete && !active && index > step;
    return { active, complete, skipped: false, pending, upcoming };
  }

  function draftPayloadForStep(stepId: TutorWizardStepId): Record<string, unknown> | null {
    switch (stepId) {
      case "photo":
        if (!photoUrl.startsWith("https://")) return null;
        return {
          photoUrl,
          photoCropX,
          photoCropY,
          photoCropZoom,
          wizardStep: "photo",
        };
      case "basics": {
        const effectiveHeadline =
          headline.trim().length >= 8
            ? headline.trim()
            : `${name.trim()} · Private tutor`.slice(0, 120);
        if (effectiveHeadline !== headline) setHeadline(effectiveHeadline);
        return {
          name: name.trim(),
          headline: effectiveHeadline,
          bio: bio.trim(),
          wizardStep: "basics",
        };
      }
      case "place":
        return {
          country,
          location: location.trim(),
          wizardStep: "place",
        };
      case "teaching":
        return {
          online,
          inPerson,
          qualifications: qualifications.trim(),
          wizardStep: "teaching",
        };
      case "finish":
        return null;
      default:
        return null;
    }
  }

  async function saveDraft(
    stepId: TutorWizardStepId,
    opts?: { silent?: boolean },
  ): Promise<boolean> {
    const payload = draftPayloadForStep(stepId);
    if (!payload) return true;
    setDraftSaving(true);
    if (!opts?.silent) {
      setError("");
      setMsg("");
      setDraftNote("");
    }
    try {
      const res = await fetch("/api/profile/tutor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Could not save this step. Try again.");
        return false;
      }
      if (!opts?.silent) {
        setDraftNote("Step saved. Continue when ready — or open optional extras below.");
        setMsg("Step saved.");
      }
      return true;
    } catch {
      setError("Could not save this step. Check your connection and try again.");
      return false;
    } finally {
      setDraftSaving(false);
    }
  }

  async function goNext() {
    setError("");
    setDraftNote("");
    const problem = validateStep(currentStep.id);
    if (problem) {
      setError(problem);
      return;
    }
    const saved = await saveDraft(currentStep.id);
    if (!saved) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setError("");
    setDraftNote("");
    setStep((s) => Math.max(0, s - 1));
  }

  async function goToStep(index: number) {
    if (index < 0 || index >= steps.length || index === step) return;
    setError("");
    setDraftNote("");
    if (!validateStep(currentStep.id)) {
      await saveDraft(currentStep.id, { silent: true });
    }
    setStep(index);
  }

  function setCountryAndCity(nextCountry: string) {
    setCountry(nextCountry);
    const nextCities = citiesForCountry(nextCountry);
    if (location && !nextCities.some((city) => city.toLowerCase() === location.toLowerCase())) {
      setLocation(nextCities.includes("Online") ? "Online" : nextCities[0] || "");
    }
  }

  function updateSlot(index: number, patch: Partial<AvailabilitySlot>) {
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    setPhotoMsg("");
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const result = await parseUploadResponse(res);
      if (!result.ok) {
        setPhotoError(result.error);
        return;
      }
      setPhotoUrl(result.url);
      setPhotoCropX(0);
      setPhotoCropY(0);
      setPhotoCropZoom(1);
      setPhotoMsg("Photo uploaded. Drag to center, then zoom if needed.");
      // Persist immediately so refresh does not lose the uploaded photo.
      void fetch("/api/profile/tutor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: result.url,
          photoCropX: 0,
          photoCropY: 0,
          photoCropZoom: 1,
          wizardStep: "photo",
        }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          setDraftNote("Photo saved — not public until you finish and save.");
        })
        .catch(() => undefined);
    } catch {
      setPhotoError("Photo upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg("");
    setError("");
    if (!online && !inPerson) {
      setError("Choose online, in person, or both.");
      return;
    }
    if (!country) {
      setError("Select the country you teach from.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter the name students see (at least 2 characters).");
      return;
    }
    if (!photoUrl.startsWith("https://")) {
      setError("Upload a profile photo before saving.");
      return;
    }
    if (!qualifications.trim()) {
      setError("Add your highest qualification before saving.");
      return;
    }
    const effectiveHeadline =
      headline.trim().length >= 8
        ? headline.trim()
        : `${name.trim()} · Private tutor`.slice(0, 120);
    const payload: Record<string, unknown> = {
      name: name.trim(),
      headline: effectiveHeadline,
      bio: bio.trim(),
      expertise: joinCsv(expertiseList),
      country,
      location: location.trim(),
      online,
      inPerson,
      photoUrl,
      photoCropX,
      photoCropY,
      photoCropZoom,
      qualifications: qualifications.trim(),
      experienceYears: experienceYears === "" ? null : Number(experienceYears),
      teachingMethod: teachingMethod.trim(),
      languages: joinCsv(languageList),
      levels: joinCsv(levelList),
      availability: serializeAvailability(slots),
      videoUrl: videoUrl.trim(),
      introVideoUrl: introVideoUrl.trim(),
      offersFreeTrial,
      phone: phone.trim(),
    };
    if (ratePkr >= MIN_HOURLY_RATE_PKR) payload.hourlyRate = ratePkr;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/tutor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        return;
      }
      if (typeof data.photoCropX === "number") setPhotoCropX(data.photoCropX);
      if (typeof data.photoCropY === "number") setPhotoCropY(data.photoCropY);
      if (typeof data.photoCropZoom === "number") setPhotoCropZoom(data.photoCropZoom);
      const nowLive = Boolean(data.active);
      setMsg(
        nowLive
          ? "Setup saved — your Teaching Profile is live in search."
          : "Setup saved. Continue to Teaching Profiles to go live.",
      );
      await update({ name: name.trim() });
      if (onSetupComplete) {
        onSetupComplete();
        router.refresh();
        return;
      }
      if (nowLive && !listingActive) {
        router.push("/dashboard/tutor?tab=profile&live=1#teaching-listings");
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const show = (id: TutorWizardStepId) => currentStep.id === id;

  const requiredChecklist = useMemo(() => {
    const rows = [
      ...completion.checks.map((row) => ({
        key: row.key,
        label: row.label,
        ok: row.ok,
        required: row.required,
      })),
      {
        key: "email",
        label: "Email verified",
        ok: Boolean(emailVerified),
        required: true,
      },
    ];
    return rows.filter((row) => row.required);
  }, [completion.checks, emailVerified]);

  const stillNeeded = useMemo(
    () =>
      requiredChecklist.filter(
        (row) =>
          !row.ok &&
          row.key !== "teachingProfile" &&
          row.key !== "listing" &&
          row.key !== "active" &&
          !/teaching profile|active in search|subject profile/i.test(row.label),
      ),
    [requiredChecklist],
  );

  const setupProgressPct = useMemo(() => {
    const setupKeys = requiredChecklist.filter(
      (row) =>
        row.key !== "teachingProfile" &&
        row.key !== "listing" &&
        row.key !== "active" &&
        !/teaching profile|active in search|subject profile/i.test(row.label),
    );
    if (setupKeys.length === 0) return 100;
    const done = setupKeys.filter((row) => row.ok).length;
    return Math.round((done / setupKeys.length) * 100);
  }, [requiredChecklist]);

  const stepNav = (
    <nav className="profile-wizard-steps" aria-label="Profile steps">
      <ol className="profile-wizard-steps-list">
        {steps.map((row, index) => {
          const { active, complete, pending } = stepStatus(row.id, index);
          const stateClass = active
            ? " is-active"
            : complete
              ? " is-complete"
              : pending
                ? " is-pending"
                : "";
          let markContent: string | number = index + 1;
          if (complete) markContent = "✓";
          else if (pending) markContent = "✕";
          const statusLabel = complete
            ? "completed"
            : pending
              ? "incomplete"
              : active
                ? "current"
                : "upcoming";
          return (
            <li key={row.id}>
              <button
                type="button"
                className={`profile-wizard-step${stateClass}`}
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${row.title} (${statusLabel})`}
                title={`${row.title} — ${statusLabel}`}
                onClick={() => void goToStep(index)}
              >
                <span className="profile-wizard-step-num" aria-hidden="true">
                  {markContent}
                </span>
                <span className="profile-wizard-step-label">{row.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  const stillNeededList =
    stillNeeded.length > 0 ? (
      <ul className="profile-complete-list profile-required-checklist" aria-label="Still needed">
        {stillNeeded.map((row) => (
          <li key={row.key} className="is-needed">
            <span className="profile-required-mark" aria-hidden="true">
              ○
            </span>
            <span className="profile-required-label">{row.label}</span>
          </li>
        ))}
      </ul>
    ) : null;

  const wizardChrome = (
    <div className="profile-wizard-chrome profile-wizard-chrome--luxe">
      <div className="profile-wizard-meta">
        <p className="guided-search-step">
          Step {step + 1} of {steps.length}
        </p>
        <p className="profile-wizard-fields muted" aria-live="polite">
          {setupProgressPct}% complete
        </p>
      </div>
      <div
        className="guided-search-progress"
        role="progressbar"
        aria-valuenow={setupProgressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div className="guided-search-progress-bar" style={{ width: `${setupProgressPct}%` }} />
      </div>
      {stepNav}
      <div className="profile-wizard-heading">
        <h3 className="guided-search-title">{currentStep.title}</h3>
        <p className="muted guided-search-hint">{currentStep.hint}</p>
      </div>
    </div>
  );

  const wizardActions = (
    <div className="guided-search-actions profile-wizard-actions profile-wizard-actions--sticky profile-wizard-actions--luxe">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={goBack}
        disabled={step === 0 || draftSaving || saving}
        aria-disabled={step === 0}
      >
        Back
      </button>
      <div className="profile-wizard-actions-right">
        {draftNote ? <p className="profile-wizard-draft-note muted">{draftNote}</p> : null}
        {currentStep.id === "finish" ? (
          <button
            className="btn"
            type="button"
            disabled={uploading || saving || draftSaving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
        ) : (
          <button
            className="btn"
            type="button"
            disabled={draftSaving || uploading || saving}
            onClick={() => void goNext()}
          >
            {draftSaving ? "Saving…" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <form
      className="stack-form profile-form profile-form-wizard"
      onSubmit={(e) => {
        e.preventDefault();
        if (currentStep.id !== "finish") {
          void goNext();
          return;
        }
        void save();
      }}
    >
      {wizardChrome}

      {currentStep.id === "finish" ? (
        <div className="profile-complete profile-complete--luxe">
          {stillNeeded.length > 0 ? (
            <>
              <p className="eyebrow">Almost ready</p>
              <h4>Finish these setup items</h4>
              {stillNeededList}
            </>
          ) : (
            <>
              <p className="eyebrow">Ready</p>
              <h4>Your tutor profile is set</h4>
              <p className="muted">
                Save to lock this in, then add the subjects you teach.
              </p>
            </>
          )}
        </div>
      ) : null}

      {show("photo") && (
      <section className="form-section profile-photo-top profile-photo-step">
        <div className="profile-photo-hero">
          <PhotoFrameAdjust
            className="profile-photo-preview profile-photo-preview-lg"
            photoUrl={photoUrl}
            cropX={photoCropX}
            cropY={photoCropY}
            cropZoom={photoCropZoom}
            borderRadius="50%"
            onChange={({ x, y, zoom }) => {
              setPhotoCropX(x);
              setPhotoCropY(y);
              setPhotoCropZoom(zoom);
            }}
            emptyLabel="Add photo"
          />
          <div className="profile-photo-hero-copy">
            <p className="field-hint profile-photo-lead">
              Drag to center your face, then zoom. JPEG, PNG, WebP, or GIF · max 2 MB.
            </p>
            <div className="profile-photo-actions">
              <button
                className="btn"
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading…"
                  : photoUrl.startsWith("http")
                    ? "Change photo"
                    : "Upload photo"}
              </button>
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              onChange={onFile}
              hidden
            />
            {photoError && <p className="form-error">{photoError}</p>}
            {photoMsg && <p className="success">{photoMsg}</p>}
            <details className="profile-photo-link">
              <summary>Or paste a photo link</summary>
              <input
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value);
                  setPhotoCropX(0);
                  setPhotoCropY(0);
                  setPhotoCropZoom(1);
                }}
                placeholder="https://"
                inputMode="url"
              />
            </details>
          </div>
        </div>
      </section>
      )}

      {show("basics") && (
      <section className="form-section">
        <label>
          <span>
            Name <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="displayName"
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The name students see"
          />
        </label>

        <div className="tutor-bio-field">
          <label>
            <span>
              About you <abbr className="req" title="Required">*</abbr>
            </span>
            <textarea
              name="bio"
              minLength={40}
              maxLength={4000}
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Who you teach, how you run lessons, and what results students can expect."
            />
          </label>
          <span className="field-hint">
            Minimum 40 characters. {bio.trim().length}/4000
          </span>
          <TutorBioAiHelp
            bio={bio}
            name={name}
            headline={headline}
            subjects={subjectList}
            location={location}
            country={country}
            qualifications={qualifications}
            experienceYears={
              experienceYears === "" || Number.isNaN(Number(experienceYears))
                ? null
                : Number(experienceYears)
            }
            teachingMethod={teachingMethod}
            languages={joinCsv(languageList)}
            levels={joinCsv(levelList)}
            expertise={joinCsv(expertiseList)}
            onApply={setBio}
          />
        </div>

        <details className="profile-advanced-details">
          <summary>Optional headline</summary>
          <label>
            <span>Tutor headline</span>
            <input
              name="headline"
              maxLength={120}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Auto-filled from your name if left blank"
            />
          </label>
        </details>
      </section>
      )}

      {show("place") && (
      <section className="form-section">
        <div className="form-grid-2">
          <label>
            <span>
              Country <abbr className="req" title="Required">*</abbr>
            </span>
            <select value={country} onChange={(e) => setCountryAndCity(e.target.value)}>
              <option value="">Select country…</option>
              {countries.map((cName) => (
                <option key={cName} value={cName}>
                  {cName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              City <abbr className="req" title="Required">*</abbr>
            </span>
            <select value={location} onChange={(e) => setLocation(e.target.value)} disabled={!country}>
              <option value="">{country ? "Select city…" : "Choose a country first"}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              {location && !cities.some((city) => city.toLowerCase() === location.toLowerCase()) && (
                <option value={location}>{location}</option>
              )}
            </select>
          </label>
        </div>
      </section>
      )}

      {show("teaching") && (
      <section className="form-section">
        <label>
          <span>
            Highest qualification <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="qualifications"
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            placeholder="e.g. MSc Chemistry, PGCE, B.Ed"
          />
        </label>

        <fieldset className="form-fieldset">
          <legend>
            Default lesson type <abbr className="req" title="Required">*</abbr>
          </legend>
          <p className="field-hint" style={{ marginTop: 0 }}>
            New Teaching Profiles inherit this. You can change it per subject.
          </p>
          <div className="checks">
            <label className="radio">
              <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} /> Online
            </label>
            <label className="radio">
              <input type="checkbox" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)} /> In person
            </label>
          </div>
        </fieldset>
      </section>
      )}

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      {wizardActions}
    </form>
  );
}
