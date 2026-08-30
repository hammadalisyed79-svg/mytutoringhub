"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { curriculumBoards, curriculumCodesForSubject } from "@/lib/curriculum";
import {
  availabilityTimeOptions,
  emptyAvailabilitySlot,
  EXPERIENCE_YEAR_OPTIONS,
  parseAvailability,
  serializeAvailability,
  WEEKDAYS,
  type AvailabilitySlot,
} from "@/lib/availability";
import { getTutorProfileCompletion } from "@/lib/tutor-profile-completion";
import { ProfileImprovePanel } from "@/components/ProfileImprovePanel";
import { TutorBioAiHelp } from "@/components/TutorBioAiHelp";
import { VerificationForm } from "@/components/VerificationForm";
import type { TutorTrustBadge } from "@/lib/tutor-badges";
import {
  currencyFromCountry,
  DEFAULT_HOURLY_RATE_PKR,
  formatMoney,
  hourlyRateInputStep,
  hourlyRateInputToPkr,
  hourlyRateInputValue,
  MIN_HOURLY_RATE_PKR,
  minHourlyRateInput,
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

const TIMES = availabilityTimeOptions();

const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const WIZARD_STEPS = [
  {
    id: "photo",
    title: "Profile photo",
    hint: "A clear headshot — required to go live.",
    optional: false,
  },
  {
    id: "basics",
    title: "About you",
    hint: "Your name and a short introduction for students.",
    optional: false,
  },
  {
    id: "place",
    title: "Location",
    hint: "Country and city for search.",
    optional: false,
  },
  {
    id: "teaching",
    title: "Qualifications",
    hint: "Your highest qualification and default lesson type. Subject Teaching Profiles come next.",
    optional: false,
  },
  {
    id: "finish",
    title: "Teaching Profile",
    hint: "Create your first Teaching Profile — one subject students can search for.",
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
  startStep,
  currency = "PKR",
  hasValidTeachingProfile = false,
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
  /** Jump straight to a wizard step (verify opens finish + ID upload). */
  startStep?: (typeof WIZARD_STEPS)[number]["id"] | "verify";
  /** Visitor/tutor location currency for rate entry (stored as PKR). */
  currency?: CurrencyCode;
  /** Skip first-profile create when an ACTIVE Teaching Profile already exists. */
  hasValidTeachingProfile?: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const photoInput = useRef<HTMLInputElement>(null);
  const countries = useMemo(() => tutorCountries(), []);
  const levelCatalog = useMemo(() => tutorLevelOptions(extraLevels), [extraLevels]);
  const languageCatalog = useMemo(() => tutorLanguageOptions(), []);
  const [country, setCountry] = useState(inferTutorCountry(initial.location, initial.country));

  /** Rate currency follows teaching country (Germany → EUR); falls back to visitor currency. */
  const rateCurrency = useMemo(() => {
    const code = countryByName(country)?.code;
    return code ? currencyFromCountry(code) : currency;
  }, [country, currency]);

  const rateMinLocal = minHourlyRateInput(rateCurrency);
  const rateStep = hourlyRateInputStep(rateCurrency);
  const rateCurrencyRef = useRef(rateCurrency);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const steps = useMemo(() => {
    return WIZARD_STEPS.map((row) => {
      if (row.id !== "finish") return row;
      if (hasValidTeachingProfile) {
        return {
          ...row,
          title: "Save profile",
          hint: "Optional extras. Your first Teaching Profile is already set.",
        };
      }
      return row;
    });
  }, [hasValidTeachingProfile]);
  const initialStepIndex = Math.max(
    0,
    startStep && startStep !== "verify"
      ? steps.findIndex((row) => row.id === startStep)
      : startStep === "verify"
        ? steps.findIndex((row) => row.id === "finish")
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
  const [subjectList, setSubjectList] = useState(splitCsv(initial.subjects));
  const [firstSubject, setFirstSubject] = useState(() => splitCsv(initial.subjects)[0] || "");
  const [teachingDescription, setTeachingDescription] = useState("");
  const [teachingLevels, setTeachingLevels] = useState<string[]>([]);
  const [teachingBoards, setTeachingBoards] = useState<string[]>([]);
  const [teachingQuals, setTeachingQuals] = useState<string[]>([]);
  const [teachingCodes, setTeachingCodes] = useState<string[]>([]);
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
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl || "");
  const [introVideoUrl, setIntroVideoUrl] = useState(initial.introVideoUrl || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [offersFreeTrial, setOffersFreeTrial] = useState(Boolean(initial.offersFreeTrial));
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [skippedOptional, setSkippedOptional] = useState<Set<string>>(() => new Set());

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
  const defaultPhoneCountry = useMemo(() => countryByName(country)?.code || "PK", [country]);
  const expertiseOptions = useMemo(() => expertiseForSubjects(subjectList), [subjectList]);
  const listedSubjects = useMemo(() => {
    const extra = [firstSubject, ...subjectList].filter(
      (name) => name && !catalogSubjects.some((item) => item.toLowerCase() === name.toLowerCase()),
    );
    return [...catalogSubjects, ...extra];
  }, [catalogSubjects, firstSubject, subjectList]);

  const boardOptions = useMemo(() => curriculumBoards(), []);
  const syllabusCodeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of curriculumCodesForSubject(firstSubject)) {
      const code = row.code?.trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
    return out;
  }, [firstSubject]);

  const ratePkr = hourlyRateInputToPkr(Number(hourlyRate) || 0, rateCurrency);

  const firstProfileReady =
    hasValidTeachingProfile ||
    Boolean(
      firstSubject.trim() &&
        ratePkr >= MIN_HOURLY_RATE_PKR &&
        teachingDescription.trim().length >= 20 &&
        (online || inPerson),
    );

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
    ],
  );

  const requiredDone = completion.requiredDone + (emailVerified ? 1 : 0);
  const requiredTotal = completion.requiredTotal + 1;
  const progress = Math.round((requiredDone / requiredTotal) * 100);
  const currentStep = steps[Math.min(step, steps.length - 1)];

  function validateStep(stepId: (typeof WIZARD_STEPS)[number]["id"]): string | null {
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
        if (hasValidTeachingProfile) return null;
        if (!firstSubject.trim()) return "Choose the subject for your first Teaching Profile.";
        if (ratePkr < MIN_HOURLY_RATE_PKR) {
          return `Hourly rate must be at least ${formatMoney(rateMinLocal, rateCurrency)} (${MIN_HOURLY_RATE_PKR} PKR).`;
        }
        if (teachingDescription.trim().length < 20) {
          return "Describe how you teach this subject (at least 20 characters).";
        }
        if (!online && !inPerson) return "Choose online, in person, or both.";
        return null;
      default:
        return null;
    }
  }

  /** True only when the step’s data is actually filled — not merely visited. */
  function isStepDataComplete(stepId: (typeof WIZARD_STEPS)[number]["id"]): boolean {
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
        return Boolean(
          completion.complete &&
            emailVerified &&
            (hasValidTeachingProfile ||
              (firstSubject.trim() &&
                ratePkr >= MIN_HOURLY_RATE_PKR &&
                teachingDescription.trim().length >= 20 &&
                (online || inPerson))),
        );
      default:
        return false;
    }
  }

  function stepStatus(stepId: (typeof WIZARD_STEPS)[number]["id"], index: number) {
    const active = index === step;
    const complete = isStepDataComplete(stepId);
    const skipped = Boolean(
      steps[index]?.optional && skippedOptional.has(stepId) && !complete,
    );
    // ✕ only for steps already passed without being filled — not for future steps.
    const pending = !complete && !skipped && !active && index < step;
    const upcoming = !complete && !skipped && !active && index > step;
    return { active, complete, skipped, pending, upcoming };
  }

  function draftPayloadForStep(stepId: (typeof WIZARD_STEPS)[number]["id"]): Record<string, unknown> | null {
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
      default:
        return null;
    }
  }

  async function saveDraft(
    stepId: (typeof WIZARD_STEPS)[number]["id"],
    opts?: { silent?: boolean },
  ): Promise<boolean> {
    const payload = draftPayloadForStep(stepId);
    if (!payload) return true;
    setDraftSaving(true);
    if (!opts?.silent) setDraftNote("");
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
        setDraftNote("Progress saved — not public until you finish and save.");
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
    if (currentStep.optional && !isStepDataComplete(currentStep.id)) {
      setSkippedOptional((prev) => {
        const next = new Set(prev);
        next.add(currentStep.id);
        return next;
      });
    }
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
    // Persist the step you're leaving when it already validates.
    if (!validateStep(currentStep.id)) {
      await saveDraft(currentStep.id, { silent: true });
    }
    if (index > step) {
      setSkippedOptional((prev) => {
        const next = new Set(prev);
        for (let i = step; i < index; i++) {
          const row = steps[i];
          if (row?.optional && !isStepDataComplete(row.id)) next.add(row.id);
        }
        return next;
      });
    }
    setStep(index);
  }

  async function skipOptional() {
    if (!currentStep.optional) return;
    setError("");
    setDraftNote("");
    setSkippedOptional((prev) => {
      const next = new Set(prev);
      next.add(currentStep.id);
      return next;
    });
    await saveDraft(currentStep.id, { silent: true });
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
    if (!hasValidTeachingProfile) {
      if (!firstSubject.trim()) {
        setError("Choose the subject for your first Teaching Profile.");
        return;
      }
      if (ratePkr < MIN_HOURLY_RATE_PKR) {
        setError(`Hourly rate must be at least ${formatMoney(rateMinLocal, rateCurrency)}.`);
        return;
      }
      if (teachingDescription.trim().length < 20) {
        setError("Describe how you teach this subject (at least 20 characters).");
        return;
      }
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
    if (hasValidTeachingProfile) {
      if (ratePkr >= MIN_HOURLY_RATE_PKR) payload.hourlyRate = ratePkr;
    } else {
      payload.hourlyRate = ratePkr;
      payload.firstTeachingProfile = {
        subject: firstSubject.trim(),
        description: teachingDescription.trim(),
        rate: ratePkr,
        online,
        inPerson,
        levels: teachingLevels,
        boards: teachingBoards,
        qualifications: teachingQuals,
        syllabusCodes: teachingCodes,
      };
    }
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
          ? "Profile saved — your Teaching Profile is live in search."
          : "Profile saved. Finish the remaining required fields to go live.",
      );
      await update({ name: name.trim() });
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

  const show = (id: (typeof WIZARD_STEPS)[number]["id"]) => currentStep.id === id;

  const completedStepCount = steps.filter((row) => isStepDataComplete(row.id)).length;
  const fieldProgressPct = progress;

  const stepNav = (
    <nav className="profile-wizard-steps" aria-label="Profile steps">
      <ol className="profile-wizard-steps-list">
        {steps.map((row, index) => {
          const { active, complete, skipped, pending } = stepStatus(row.id, index);
          const stateClass = active
            ? " is-active"
            : complete
              ? " is-complete"
              : skipped
                ? " is-skipped"
                : pending
                  ? " is-pending"
                  : "";
          let markContent: string | number = index + 1;
          if (complete) markContent = "✓";
          else if (skipped) markContent = "–";
          else if (pending) markContent = "✕";
          const statusLabel = complete
            ? "completed"
            : skipped
              ? "skipped"
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
                aria-label={`Step ${index + 1}: ${row.title} (${statusLabel}${row.optional ? ", optional" : ""})`}
                title={`${row.title} — ${statusLabel}`}
                onClick={() => void goToStep(index)}
              >
                <span className="profile-wizard-step-num" aria-hidden="true">
                  {markContent}
                </span>
                {active ? <span className="profile-wizard-step-label">{row.title}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  const wizardChrome = (
    <div className="profile-wizard-chrome">
      <div className="profile-wizard-meta">
        <p className="guided-search-step">
          Step {step + 1} of {steps.length}
          {currentStep.optional ? " · Optional" : " · Required"}
        </p>
        <p className="profile-wizard-fields muted" aria-live="polite">
          {requiredDone}/{requiredTotal} required fields · {fieldProgressPct}% ·{" "}
          {completedStepCount}/{steps.length} steps done
        </p>
      </div>
      <div
        className="guided-search-progress"
        role="progressbar"
        aria-valuenow={fieldProgressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Required profile fields"
      >
        <div className="guided-search-progress-bar" style={{ width: `${fieldProgressPct}%` }} />
      </div>
      {stepNav}
      <div className="profile-wizard-legend" aria-hidden="true">
        <span>
          <i className="profile-wizard-legend-dot is-complete" /> Done
        </span>
        <span>
          <i className="profile-wizard-legend-dot is-pending" /> Incomplete
        </span>
      </div>
      <h3 className="guided-search-title">{currentStep.title}</h3>
      <p className="muted guided-search-hint">{currentStep.hint}</p>
      <p className="field-hint profile-wizard-persist-hint">
        Five short steps. Progress saves as you go — you stay private until you save a Teaching Profile.
      </p>
    </div>
  );

  const wizardActions = (
    <div className="guided-search-actions profile-wizard-actions">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={goBack}
        disabled={step === 0 || draftSaving}
        aria-disabled={step === 0}
      >
        Back
      </button>
      <div className="profile-wizard-actions-right">
        {draftNote ? <p className="profile-wizard-draft-note muted">{draftNote}</p> : null}
        {currentStep.optional ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={draftSaving}
            onClick={() => void skipOptional()}
          >
            Skip for now
          </button>
        ) : null}
        {currentStep.id === "finish" ? (
          <button className="btn" type="button" disabled={uploading || saving || draftSaving} onClick={() => void save()}>
            {saving
              ? "Saving…"
              : hasValidTeachingProfile
                ? "Save profile"
                : "Create Teaching Profile"}
          </button>
        ) : (
          <button className="btn" type="button" disabled={draftSaving || uploading} onClick={() => void goNext()}>
            {draftSaving ? "Saving…" : "Next"}
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
        <div className="profile-complete profile-complete--compact">
          <div className="profile-complete-head">
            <strong>
              Ready to save · {requiredDone}/{requiredTotal} required fields ready
            </strong>
            <span className="profile-complete-pct">{progress}%</span>
          </div>
          <div className="profile-progress" aria-hidden>
            <span style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          <p className="field-hint" style={{ margin: "0.45rem 0 0" }}>
            {hasValidTeachingProfile
              ? "Your first Teaching Profile is already set. Save any remaining profile details, then manage Teaching Profiles below."
              : "Create one Teaching Profile for a single subject. Add more subjects later as separate Teaching Profiles."}
          </p>
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
            onChange={({ x, y, zoom }) => {
              setPhotoCropX(x);
              setPhotoCropY(y);
              setPhotoCropZoom(zoom);
            }}
            emptyLabel="Add photo"
          />
          <div className="profile-photo-hero-copy">
            <p className="field-hint profile-photo-lead">
              Use a clear headshot with your face visible. JPEG, PNG, WebP, or GIF · max 2 MB.
              No biometric checks are run.
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
            {!photoUrl.startsWith("http") && !photoError ? (
              <p className="field-required-note" role="status">
                Required to go live — upload a photo, then continue.
              </p>
            ) : null}
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

      {currentStep.id === "finish" && (
        <>
          {hasValidTeachingProfile ? (
            <p className="field-hint">
              You already have a Teaching Profile. Manage subjects, rates, and Boost under{" "}
              <strong>My Teaching Profiles</strong> below. Optional extras here stay on your main profile.
            </p>
          ) : (
            <section className="form-section">
              <CatalogMultiSelect
                label="Subject"
                required
                searchable
                directory
                max={1}
                selected={firstSubject ? [firstSubject] : []}
                onChange={(next) => {
                  const value = next[0] || "";
                  setFirstSubject(value);
                  setSubjects(value ? [value] : []);
                }}
                options={listedSubjects}
                addLabel="Add subject"
                hint="One canonical subject per Teaching Profile (for example Mathematics, not GCSE Maths)."
              />

              <label>
                <span>
                  Hourly rate ({rateCurrency}) <abbr className="req" title="Required">*</abbr>
                </span>
                <input
                  name="hourlyRate"
                  type="number"
                  min={rateMinLocal}
                  step={rateStep}
                  inputMode="decimal"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
                <span className="field-hint">
                  Minimum {formatMoney(rateMinLocal, rateCurrency)}. This rate is for this Teaching Profile.
                </span>
              </label>

              <label>
                <span>
                  Teaching description <abbr className="req" title="Required">*</abbr>
                </span>
                <textarea
                  name="teachingDescription"
                  minLength={20}
                  maxLength={4000}
                  rows={4}
                  value={teachingDescription}
                  onChange={(e) => setTeachingDescription(e.target.value)}
                  placeholder="Who this subject is for, how you teach it, and what results students can expect."
                />
                <span className="field-hint">{teachingDescription.trim().length}/4000 · at least 20 characters</span>
              </label>

              <fieldset className="form-fieldset">
                <legend>
                  How you teach this subject <abbr className="req" title="Required">*</abbr>
                </legend>
                <div className="checks">
                  <label className="radio">
                    <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} /> Online
                  </label>
                  <label className="radio">
                    <input
                      type="checkbox"
                      checked={inPerson}
                      onChange={(e) => setInPerson(e.target.checked)}
                    />{" "}
                    In person
                  </label>
                </div>
              </fieldset>

              <CatalogMultiSelect
                label="Levels"
                selected={teachingLevels}
                onChange={setTeachingLevels}
                options={levelCatalog.core}
                extraOptions={levelCatalog.more}
                max={12}
                addLabel="Add level"
                hint="Select every level this subject covers (GCSE and A Level can live on the same Mathematics profile)."
              />
              <CatalogMultiSelect
                label="Exam boards / curricula"
                selected={teachingBoards}
                onChange={setTeachingBoards}
                options={boardOptions}
                max={12}
                addLabel="Add board"
                hint="Optional. Cambridge, Edexcel, and others belong inside this subject profile."
              />
              <CatalogMultiSelect
                label="Qualification stages"
                selected={teachingQuals}
                onChange={setTeachingQuals}
                options={levelCatalog.core}
                extraOptions={levelCatalog.more}
                max={12}
                addLabel="Add qualification"
                hint="Optional. O Level, GCSE, A Level, IB, and similar."
              />
              <CatalogMultiSelect
                label="Syllabus / subject codes"
                selected={teachingCodes}
                onChange={setTeachingCodes}
                options={syllabusCodeOptions}
                searchable
                max={16}
                addLabel="Add code"
                hint="Optional. e.g. 0580, 9709 — helps Past Papers visitors find you."
              />
            </section>
          )}
          <details className="profile-advanced-details" id="get-verified" open={startStep === "verify"}>
            <summary>Optional — ID verification, schedule, contact</summary>
            <div className="profile-advanced-block">
              {!verified ? <VerificationForm embedded compact /> : (
                <p className="success">You are verified.</p>
              )}
              <CatalogMultiSelect
                label="Expertise"
                selected={expertiseList}
                onChange={setExpertiseList}
                options={expertiseOptions}
                extraOptions={GENERIC_EXPERTISE}
                max={16}
                addLabel="Add expertise"
              />
              <CatalogMultiSelect
                label="Levels"
                selected={levelList}
                onChange={setLevelList}
                options={levelCatalog.core}
                extraOptions={levelCatalog.more}
                max={10}
                addLabel="Add levels"
              />
              <CatalogMultiSelect
                label="Languages"
                selected={languageList}
                onChange={setLanguageList}
                options={languageCatalog.core}
                extraOptions={languageCatalog.more}
                max={8}
                addLabel="Add languages"
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
                  rows={2}
                  value={teachingMethod}
                  onChange={(e) => setTeachingMethod(e.target.value)}
                  placeholder="Past papers, weekly homework…"
                />
              </label>
              <fieldset className="catalog-pick">
                <legend>Weekly availability</legend>
                <div className="schedule-rows">
                  {slots.map((slot, index) => (
                    <div key={`${slot.day}-${index}`} className="schedule-row">
                      <select
                        aria-label="Day"
                        value={slot.day}
                        onChange={(e) =>
                          updateSlot(index, { day: e.target.value as AvailabilitySlot["day"] })
                        }
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
              <label className="radio">
                <input
                  type="checkbox"
                  checked={offersFreeTrial}
                  onChange={(e) => setOffersFreeTrial(e.target.checked)}
                />{" "}
                Free first lesson
              </label>
              <label>
                Intro video URL
                <input
                  name="introVideoUrl"
                  value={introVideoUrl}
                  onChange={(e) => setIntroVideoUrl(e.target.value)}
                  placeholder="YouTube or Vimeo"
                  inputMode="url"
                />
              </label>
              <label>
                Phone
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  defaultCountryCode={defaultPhoneCountry}
                  hint="Shown publicly only after verification."
                />
              </label>
            </div>
          </details>
          <ProfileImprovePanel
            listingLive={listingActive}
            verified={verified}
            trustBadge={trustBadge}
          />
        </>
      )}

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      {wizardActions}
    </form>
  );
}
