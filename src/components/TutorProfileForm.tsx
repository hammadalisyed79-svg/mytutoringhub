"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CatalogMultiSelect } from "@/components/CatalogMultiSelect";
import { PhotoFrameAdjust } from "@/components/PhotoFrameAdjust";
import { PhoneInput } from "@/components/PhoneInput";
import { countryByName } from "@/lib/markets";
import {
  citiesForCountry,
  expertiseForSubjects,
  GENERIC_EXPERTISE,
  inferTutorCountry,
  joinCsv,
  splitCsv,
  tutorCountries,
  tutorLanguageOptions,
  tutorLevelOptions,
} from "@/lib/tutor-catalog";
import {
  availabilityTimeOptions,
  emptyAvailabilitySlot,
  EXPERIENCE_YEAR_OPTIONS,
  parseAvailability,
  serializeAvailability,
  WEEKDAYS,
  type AvailabilitySlot,
} from "@/lib/availability";
import { embedVideoSrc } from "@/lib/media";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";
import { ProfileImprovePanel } from "@/components/ProfileImprovePanel";
import { VerificationForm } from "@/components/VerificationForm";
import type { TutorTrustBadge } from "@/lib/tutor-badges";

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

const TIMES = availabilityTimeOptions();

const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const WIZARD_STEPS = [
  {
    id: "photo",
    title: "Add a profile photo",
    hint: "A clear headshot helps students trust you. Required to go live.",
    optional: false,
  },
  {
    id: "basics",
    title: "Name and about you",
    hint: "This is what students read first.",
    optional: false,
  },
  {
    id: "place",
    title: "Where you teach from",
    hint: "Country and city power search filters.",
    optional: false,
  },
  {
    id: "teaching",
    title: "Subjects, rate, and format",
    hint: "What you teach and how students book you.",
    optional: false,
  },
  {
    id: "qualifications",
    title: "Qualifications",
    hint: "Your highest qualification is required for search.",
    optional: false,
  },
  {
    id: "extras",
    title: "Strengthen your listing",
    hint: "Optional — levels, languages, and expertise. Skip if you want to finish faster.",
    optional: true,
  },
  {
    id: "schedule",
    title: "Weekly availability",
    hint: "Optional — students see this on your public profile.",
    optional: true,
  },
  {
    id: "contact",
    title: "Contact and intro video",
    hint: "Optional — phone and video links. Skip anytime.",
    optional: true,
  },
  {
    id: "verify",
    title: "Get verified",
    hint: "Optional — upload a government photo ID for the Verified badge. Skip and do this later if you prefer.",
    optional: true,
  },
  {
    id: "finish",
    title: "Save and grow",
    hint: "Save your listing, then grow with star badges and optional boosts.",
    optional: false,
  },
] as const;

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
  subjects: catalogSubjects,
  extraLevels = [],
  emailVerified = true,
  listingActive = false,
  verified = false,
  trustBadge = "NEW",
  wizard = true,
}: {
  initial: Initial;
  displayName: string;
  subjects: string[];
  extraLevels?: string[];
  emailVerified?: boolean;
  /** Whether the listing is currently public (DB active flag). */
  listingActive?: boolean;
  verified?: boolean;
  trustBadge?: TutorTrustBadge | string;
  /** Step-by-step form with Skip on optional fields. */
  wizard?: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const photoInput = useRef<HTMLInputElement>(null);
  const countries = useMemo(() => tutorCountries(), []);
  const levelCatalog = useMemo(() => tutorLevelOptions(extraLevels), [extraLevels]);
  const languageCatalog = useMemo(() => tutorLanguageOptions(), []);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [flatMode, setFlatMode] = useState(!wizard);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl || "");
  const [photoCropX, setPhotoCropX] = useState(initial.photoCropX ?? 0);
  const [photoCropY, setPhotoCropY] = useState(initial.photoCropY ?? 0);
  const [photoCropZoom, setPhotoCropZoom] = useState(initial.photoCropZoom ?? 1);
  const [uploading, setUploading] = useState(false);
  const [headline, setHeadline] = useState(initial.headline || "");
  const [name, setName] = useState(displayName);
  const [bio, setBio] = useState(initial.bio || "");
  const [subjectList, setSubjectList] = useState(splitCsv(initial.subjects));
  const [expertiseList, setExpertiseList] = useState(splitCsv(initial.expertise));
  const [levelList, setLevelList] = useState(splitCsv(initial.levels));
  const [languageList, setLanguageList] = useState(splitCsv(initial.languages));
  const [country, setCountry] = useState(inferTutorCountry(initial.location, initial.country));
  const [location, setLocation] = useState(initial.location || "");
  const [hourlyRate, setHourlyRate] = useState(String(initial.hourlyRate || 1500));
  const [online, setOnline] = useState(initial.online);
  const [inPerson, setInPerson] = useState(initial.inPerson);
  const [qualifications, setQualifications] = useState(initial.qualifications || "");
  const [experienceYears, setExperienceYears] = useState(
    initial.experienceYears == null ? "" : String(initial.experienceYears),
  );
  const [teachingMethod, setTeachingMethod] = useState(initial.teachingMethod || "");
  const [slots, setSlots] = useState<AvailabilitySlot[]>(() => parseAvailability(initial.availability));
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl || "");
  const [introVideoUrl, setIntroVideoUrl] = useState(initial.introVideoUrl || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [offersFreeTrial, setOffersFreeTrial] = useState(Boolean(initial.offersFreeTrial));

  const videoSrc = embedVideoSrc(introVideoUrl || videoUrl);
  const cities = useMemo(() => citiesForCountry(country), [country]);
  const defaultPhoneCountry = useMemo(() => countryByName(country)?.code || "PK", [country]);
  const expertiseOptions = useMemo(() => expertiseForSubjects(subjectList), [subjectList]);
  const listedSubjects = useMemo(() => {
    const extra = subjectList.filter(
      (name) => !catalogSubjects.some((item) => item.toLowerCase() === name.toLowerCase()),
    );
    return [...catalogSubjects, ...extra];
  }, [catalogSubjects, subjectList]);

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
        hourlyRate: Number(hourlyRate) || 0,
        online,
        inPerson,
        qualifications,
      }),
    [
      name,
      photoUrl,
      headline,
      bio,
      country,
      location,
      subjectList,
      hourlyRate,
      online,
      inPerson,
      qualifications,
    ],
  );

  const recommendedChecks = useMemo(
    () => [
      { label: "Expertise", ok: expertiseList.length > 0 },
      { label: "Levels", ok: levelList.length > 0 },
      { label: "Languages", ok: languageList.length > 0 },
      { label: "Experience", ok: experienceYears !== "" },
      { label: "Availability", ok: slots.length > 0 },
      { label: "Phone", ok: phone.trim().length > 0 },
    ],
    [expertiseList, levelList, languageList, experienceYears, slots, phone],
  );

  const requiredDone = completion.requiredDone + (emailVerified ? 1 : 0);
  const requiredTotal = completion.requiredTotal + 1;
  const progress = Math.round((requiredDone / requiredTotal) * 100);
  const steps = useMemo(
    () => (verified ? WIZARD_STEPS.filter((row) => row.id !== "verify") : WIZARD_STEPS),
    [verified],
  );
  const currentStep = steps[Math.min(step, steps.length - 1)];
  const wizardProgress = Math.round(((step + 1) / steps.length) * 100);

  function validateStep(stepId: (typeof WIZARD_STEPS)[number]["id"]): string | null {
    switch (stepId) {
      case "photo":
        if (!photoUrl.startsWith("https://")) return "Upload a profile photo to continue.";
        return null;
      case "basics":
        if (name.trim().length < 2) return "Enter the name students see (at least 2 characters).";
        if (headline.trim().length < 8) return "Add a headline of at least 8 characters.";
        if (bio.trim().length < 40) return "Write at least 40 characters about your teaching.";
        return null;
      case "place":
        if (!country) return "Select the country you teach from.";
        if (!location.trim()) return "Select a city.";
        return null;
      case "teaching":
        if (!subjectList.length) return "Select at least one subject.";
        if (Number(hourlyRate) < 500) return "Hourly rate must be at least 500 PKR.";
        if (!online && !inPerson) return "Choose online, in person, or both.";
        return null;
      case "qualifications":
        if (!qualifications.trim()) return "Add your highest qualification.";
        return null;
      default:
        return null;
    }
  }

  function goNext() {
    setError("");
    const problem = validateStep(currentStep.id);
    if (problem) {
      setError(problem);
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  function skipOptional() {
    if (!currentStep.optional) return;
    setError("");
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function setCountryAndCity(nextCountry: string) {
    setCountry(nextCountry);
    const nextCities = citiesForCountry(nextCountry);
    if (location && !nextCities.some((city) => city.toLowerCase() === location.toLowerCase())) {
      setLocation(nextCities.includes("Online") ? "Online" : nextCities[0] || "");
    }
  }

  function setSubjects(next: string[]) {
    setSubjectList(next);
    const allowed = new Set(
      [...expertiseForSubjects(next), ...GENERIC_EXPERTISE].map((item) => item.toLowerCase()),
    );
    setExpertiseList((current) => current.filter((item) => allowed.has(item.toLowerCase())));
  }

  function updateSlot(index: number, patch: Partial<AvailabilitySlot>) {
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function focusCrop() {
    setPhotoMsg("Drag inside the frame to reposition · scroll to zoom in or out.");
  }

  function resetCrop() {
    setPhotoCropX(0);
    setPhotoCropY(0);
    setPhotoCropZoom(1);
    setPhotoMsg("Crop reset. Drag inside the frame to reposition · scroll to zoom.");
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
      setPhotoMsg("Drag the photo to adjust · scroll to zoom");
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
    if (!subjectList.length) {
      setError("Select at least one subject from the catalog.");
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
    const payload = {
      name: name.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      subjects: joinCsv(subjectList),
      expertise: joinCsv(expertiseList),
      country,
      hourlyRate: Number(hourlyRate),
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
          ? "Profile saved — your listing is live in search."
          : "Profile saved. Finish the remaining required fields to go live.",
      );
      await update({ name: name.trim() });
      if (nowLive && !listingActive) {
        router.push("/dashboard/tutor?tab=growth&live=1");
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

  const show = (id: (typeof WIZARD_STEPS)[number]["id"]) => flatMode || currentStep.id === id;

  const wizardChrome = !flatMode ? (
    <div className="profile-wizard-chrome">
      <div className="guided-search-progress" aria-hidden="true">
        <div className="guided-search-progress-bar" style={{ width: `${wizardProgress}%` }} />
      </div>
      <p className="guided-search-step muted">
        Step {step + 1} of {steps.length}
        {currentStep.optional ? " · Optional" : " · Required"}
      </p>
      <h3 className="guided-search-title">{currentStep.title}</h3>
      <p className="muted guided-search-hint">{currentStep.hint}</p>
      <div className="profile-wizard-toggle">
        <button type="button" className="linkish" onClick={() => setFlatMode(true)}>
          Show all fields instead
        </button>
      </div>
    </div>
  ) : (
    <div className="profile-wizard-toggle">
      <button
        type="button"
        className="linkish"
        onClick={() => {
          setFlatMode(false);
          setStep(0);
        }}
      >
        Use step-by-step wizard
      </button>
    </div>
  );

  const wizardActions = flatMode ? null : (
    <div className="guided-search-actions profile-wizard-actions">
      {step > 0 ? (
        <button type="button" className="btn btn-secondary" onClick={goBack}>
          Back
        </button>
      ) : (
        <span />
      )}
      <div className="profile-wizard-actions-right">
        {currentStep.optional ? (
          <button type="button" className="btn btn-secondary" onClick={skipOptional}>
            Skip for now
          </button>
        ) : null}
        {currentStep.id === "finish" ? (
          <button className="btn" type="button" disabled={uploading || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        ) : (
          <button className="btn" type="button" onClick={goNext}>
            {currentStep.id === "verify" ? "Continue" : "Next"}
          </button>
        )}
      </div>
    </div>
  );

  // Keep verification outside the profile <form> to avoid nested forms.
  if (!flatMode && currentStep.id === "verify") {
    return (
      <div className="stack-form profile-form profile-form-wizard" id="get-verified">
        {wizardChrome}
        <VerificationForm embedded compact />
        {wizardActions}
      </div>
    );
  }

  return (
    <form
      className={`stack-form profile-form${flatMode ? "" : " profile-form-wizard"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!flatMode && currentStep.id !== "finish") {
          goNext();
          return;
        }
        void save();
      }}
    >
      {wizardChrome}
      <div className="profile-complete">
        <div className="profile-complete-head">
          <strong>
            {requiredDone}/{requiredTotal} listing requirements complete
          </strong>
          <span className="muted">{progress}%</span>
        </div>
        <div className="profile-progress" aria-hidden>
          <span style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <p className="field-hint" style={{ margin: "0.35rem 0 0" }}>
          Required fields use the same rules as public search eligibility. Optional steps can be
          skipped — you can fill them later.
        </p>
        {(flatMode || currentStep.id === "finish") && (
          <ul className="profile-complete-list">
            <li className={emailVerified ? "is-done" : "is-needed"}>
              {emailVerified ? "✓" : "○"} Email verified
            </li>
            {completion.checks.map((c) => (
              <li key={c.key} className={c.ok ? "is-done" : c.required ? "is-needed" : ""}>
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
            {recommendedChecks.map((c) => (
              <li key={c.label} className={c.ok ? "is-done" : ""}>
                {c.ok ? "✓" : "○"} {c.label} (recommended)
              </li>
            ))}
          </ul>
        )}
      </div>

      {show("photo") && (
      <section className="form-section profile-photo-top profile-photo-required">
        <div className="profile-photo-hero">
          <PhotoFrameAdjust
            className="profile-photo-preview profile-photo-preview-lg"
            photoUrl={photoUrl}
            cropX={photoCropX}
            cropY={photoCropY}
            cropZoom={photoCropZoom}
            onChange={({ x, y, zoom }) => {
              setPhotoCropX(x);
              setPhotoCropY(y);
              setPhotoCropZoom(zoom);
            }}
            emptyLabel="Add photo *"
          />
          <div className="profile-photo-hero-copy">
            <h3>
              Profile photo <abbr className="req" title="Required">*</abbr>
            </h3>
            <p className="field-hint">
              A clear, professional-looking headshot helps students trust your listing. Face clearly
              visible works best — no biometric checks are run. JPEG, PNG, WebP, or GIF · max 2 MB.
            </p>
            <div className="profile-photo-actions">
              <button
                className="btn btn-secondary btn-sm"
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
              {photoUrl.startsWith("http") && (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={focusCrop}
                    disabled={uploading}
                  >
                    Adjust crop
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={resetCrop}
                    disabled={uploading}
                  >
                    Reset crop
                  </button>
                </>
              )}
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
            {!photoUrl.startsWith("http") && (
              <p className="form-error" style={{ marginBottom: 0 }}>
                A profile photo is required before your listing can go live.
              </p>
            )}
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
        <h3>Basic information</h3>
        <p className="field-hint">Students use these to decide whether to message you.</p>

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
          <span className="field-hint">
            Use your real teaching name. Placeholder or promotional names cannot go live in search.
          </span>
        </label>

        <label>
          <span>
            Tutor headline <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="headline"
            minLength={8}
            maxLength={120}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Cambridge IGCSE & A Level Physics Tutor"
          />
          <span className="field-hint">
            {headline.trim().length}/120 · Be specific — e.g. “Cambridge IGCSE &amp; A Level Physics
            Tutor”, not just “Teacher”.
          </span>
        </label>

        <label>
          <span>
            About me <abbr className="req" title="Required">*</abbr>
          </span>
          <textarea
            name="bio"
            minLength={40}
            maxLength={4000}
            rows={6}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Who you teach, how you run lessons, and what results students can expect."
          />
          <span className="field-hint">
            Tell students about your teaching experience, subjects, teaching style, and who you can
            help. Aim for about 120–400 characters (minimum 40). {bio.trim().length}/4000
          </span>
        </label>
      </section>
      )}

      {show("place") && (
      <section className="form-section">
        <h3>Location</h3>
        <p className="field-hint">Country and city are shown on your public profile and used in search.</p>
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
        <h3>Subjects &amp; teaching</h3>
        <CatalogMultiSelect
          label="Subjects you teach"
          required
          searchable
          directory
          max={12}
          selected={subjectList}
          onChange={setSubjects}
          options={listedSubjects}
          addLabel="Add another listed subject"
          hint="Choose from the catalog (e.g. Mathematics) — avoid free-text duplicates like Math / Maths when the listed subject already exists."
        />

        <label>
          <span>
            Hourly rate (PKR) <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="hourlyRate"
            type="number"
            min={500}
            step={100}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
          <span className="field-hint">Students see this converted to their local currency. Minimum 500 PKR.</span>
        </label>

        <fieldset className="form-fieldset">
          <legend>
            Lesson type <abbr className="req" title="Required">*</abbr>
          </legend>
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

      {show("qualifications") && (
      <section className="form-section">
        <h3>Qualifications</h3>
        <label>
          Highest qualification <abbr className="req" title="Required">*</abbr>
          <textarea
            name="qualifications"
            rows={3}
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            placeholder="MSc Chemistry, examiner experience, teaching licence…"
          />
        </label>
      </section>
      )}

      {show("extras") && (
      <section className="form-section">
        <h3>Strengthen your listing {flatMode ? "(recommended)" : "(optional)"}</h3>
        <CatalogMultiSelect
          label="Expertise"
          selected={expertiseList}
          onChange={setExpertiseList}
          options={expertiseOptions}
          extraOptions={GENERIC_EXPERTISE}
          max={16}
          addLabel="Add more expertise"
          emptyHint="Select subjects first — expertise follows those subjects."
          hint={
            subjectList.length
              ? "Skills are matched to the subjects you selected."
              : "Select subjects first — expertise options follow those subjects."
          }
        />
        <CatalogMultiSelect
          label="Levels"
          selected={levelList}
          onChange={setLevelList}
          options={levelCatalog.core}
          extraOptions={levelCatalog.more}
          max={10}
          addLabel="Add more levels"
          hint="Tap every stage you teach."
        />
        <CatalogMultiSelect
          label="Languages"
          selected={languageList}
          onChange={setLanguageList}
          options={languageCatalog.core}
          extraOptions={languageCatalog.more}
          max={8}
          addLabel="Add more languages"
          hint="Languages you can teach in."
        />
        <label>
          Experience in years
          <select value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)}>
            <option value="">Select years…</option>
            {EXPERIENCE_YEAR_OPTIONS.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          How you teach
          <textarea
            name="teachingMethod"
            rows={3}
            value={teachingMethod}
            onChange={(e) => setTeachingMethod(e.target.value)}
            placeholder="Past papers, weekly homework, lesson notes after each session…"
          />
        </label>
      </section>
      )}

      {show("schedule") && (
      <section className="form-section">
        <h3>Weekly availability {flatMode ? "" : "(optional)"}</h3>
        <fieldset className="catalog-pick">
          <legend>Weekly availability</legend>
          <p className="field-hint">
            Add the days and times you can teach. Students see this calendar on your public profile.
          </p>
          <div className="schedule-rows">
            {slots.map((slot, index) => (
              <div key={`${slot.day}-${index}`} className="schedule-row">
                <select
                  aria-label="Day"
                  value={slot.day}
                  onChange={(e) => updateSlot(index, { day: e.target.value as AvailabilitySlot["day"] })}
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Start time"
                  value={slot.start}
                  onChange={(e) => updateSlot(index, { start: e.target.value })}
                >
                  {TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span className="muted">to</span>
                <select
                  aria-label="End time"
                  value={slot.end}
                  onChange={(e) => updateSlot(index, { end: e.target.value })}
                >
                  {TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => setSlots((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={() => setSlots((current) => [...current, emptyAvailabilitySlot()])}
          >
            Add time slot
          </button>
        </fieldset>
      </section>
      )}

      {show("contact") && (
      <section className="form-section">
        <h3>Contact and media {flatMode ? "(optional)" : "(optional)"}</h3>
        <label className="radio">
          <input
            type="checkbox"
            checked={offersFreeTrial}
            onChange={(e) => setOffersFreeTrial(e.target.checked)}
          />{" "}
          Free first lesson
        </label>
        <label>
          Intro video link
          <input
            name="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube or Vimeo URL"
            inputMode="url"
          />
        </label>
        <label>
          Introduction video URL
          <input
            name="introVideoUrl"
            value={introVideoUrl}
            onChange={(e) => setIntroVideoUrl(e.target.value)}
            placeholder="YouTube, Vimeo, or direct video link"
            inputMode="url"
          />
        </label>
        {videoSrc ? (
          <div className="media-embed-wrap profile-video-preview">
            <iframe
              className="media-embed"
              title="Intro video preview"
              src={videoSrc}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}
        <label>
          Phone
          <PhoneInput
            value={phone}
            onChange={setPhone}
            defaultCountryCode={defaultPhoneCountry}
            hint="Shown on your public profile only after you are verified."
          />
        </label>
      </section>
      )}

      {(flatMode || currentStep.id === "finish") && (
        <ProfileImprovePanel
          listingLive={listingActive}
          verified={verified}
          trustBadge={trustBadge}
        />
      )}

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      {flatMode ? (
        <button className="btn" type="submit" disabled={uploading || saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      ) : (
        wizardActions
      )}
    </form>
  );
}
