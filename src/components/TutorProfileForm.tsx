"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CatalogMultiSelect } from "@/components/CatalogMultiSelect";
import { PhotoFrameAdjust } from "@/components/PhotoFrameAdjust";
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
}: {
  initial: Initial;
  displayName: string;
  subjects: string[];
  extraLevels?: string[];
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
  const expertiseOptions = useMemo(() => expertiseForSubjects(subjectList), [subjectList]);
  const listedSubjects = useMemo(() => {
    const extra = subjectList.filter(
      (name) => !catalogSubjects.some((item) => item.toLowerCase() === name.toLowerCase()),
    );
    return [...catalogSubjects, ...extra];
  }, [catalogSubjects, subjectList]);

  const checks = useMemo(
    () => [
      { label: "Name", ok: name.trim().length >= 2, required: true },
      { label: "Photo", ok: photoUrl.startsWith("https://"), required: true },
      { label: "Headline", ok: headline.trim().length >= 8, required: true },
      { label: "About you", ok: bio.trim().length >= 40, required: true },
      { label: "Country", ok: country.trim().length >= 2, required: true },
      { label: "City", ok: location.trim().length >= 2, required: true },
      { label: "Subjects", ok: subjectList.length > 0, required: true },
      { label: "Expertise", ok: expertiseList.length > 0, required: false },
      { label: "Levels", ok: levelList.length > 0, required: false },
      { label: "Languages", ok: languageList.length > 0, required: false },
      { label: "Hourly rate", ok: Number(hourlyRate) >= 500, required: true },
      { label: "Lesson type", ok: online || inPerson, required: true },
      { label: "Qualifications", ok: qualifications.trim().length > 0, required: false },
      { label: "Experience", ok: experienceYears !== "", required: false },
      { label: "Availability", ok: slots.length > 0, required: false },
      { label: "Phone", ok: phone.trim().length > 0, required: false },
    ],
    [
      photoUrl,
      name,
      headline,
      bio,
      country,
      location,
      subjectList,
      expertiseList,
      levelList,
      languageList,
      hourlyRate,
      online,
      inPerson,
      qualifications,
      experienceYears,
      slots,
      phone,
    ],
  );

  const requiredDone = checks.filter((c) => c.required && c.ok).length;
  const requiredTotal = checks.filter((c) => c.required).length;
  const recommendedDone = checks.filter((c) => !c.required && c.ok).length;
  const progress = Math.round(
    ((requiredDone + recommendedDone * 0.5) / (requiredTotal + checks.filter((c) => !c.required).length * 0.5)) *
      100,
  );

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

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      setMsg("Profile saved. You can edit any of these details anytime.");
      await update({ name: name.trim() });
      router.refresh();
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack-form profile-form" onSubmit={save}>
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
              Required on your public listing. After uploading, <strong>drag inside the frame</strong>{" "}
              to crop and reposition, or <strong>scroll to zoom</strong>. Then click{" "}
              <strong>Save profile</strong> below.
            </p>
            <p className="field-hint">JPEG, PNG, WebP, or GIF · max 2 MB</p>
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
                required
              />
            </details>
          </div>
        </div>
      </section>

      <div className="profile-complete">
        <div className="profile-complete-head">
          <strong>
            {requiredDone}/{requiredTotal} required fields complete
          </strong>
          <span className="muted">{progress}% listing strength</span>
        </div>
        <div className="profile-progress" aria-hidden>
          <span style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <p className="field-hint" style={{ margin: "0.35rem 0 0" }}>
          Every field on this listing stays editable after you save. Only accepted verification
          documents are locked.
        </p>
        <ul className="profile-complete-list">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "is-done" : c.required ? "is-needed" : ""}>
              {c.ok ? "✓" : c.required ? "•" : "○"} {c.label}
              {c.required ? "" : " (recommended)"}
            </li>
          ))}
        </ul>
      </div>

      <section className="form-section">
        <h3>Listing basics</h3>
        <p className="field-hint">Students use these to decide whether to message you.</p>

        <label>
          <span>
            Name <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The name students see"
          />
          <span className="field-hint">
            Filled from your Gmail profile when you sign in with Google. You can change it anytime —
            it appears on search cards and your public listing.
          </span>
        </label>

        <label>
          <span>
            Headline <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="headline"
            required
            minLength={8}
            maxLength={120}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="A Level Chemistry · 8 years · exam specialist"
          />
          <span className="field-hint">{headline.trim().length}/120 · One line that says who you teach.</span>
        </label>

        <label>
          <span>
            About you <abbr className="req" title="Required">*</abbr>
          </span>
          <textarea
            name="bio"
            required
            minLength={40}
            maxLength={4000}
            rows={6}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Who you teach, how you run lessons, and what results students can expect."
          />
          <span className="field-hint">{bio.trim().length}/4000 · At least 40 characters.</span>
        </label>
      </section>

      <section className="form-section">
        <h3>Where you teach</h3>
        <p className="field-hint">Country and city are shown on your public profile and used in search.</p>
        <div className="form-grid-2">
          <label>
            <span>
              Country <abbr className="req" title="Required">*</abbr>
            </span>
            <select required value={country} onChange={(e) => setCountryAndCity(e.target.value)}>
              <option value="">Select country…</option>
              {countries.map((name) => (
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
            <select required value={location} onChange={(e) => setLocation(e.target.value)} disabled={!country}>
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

      <section className="form-section">
        <h3>Subjects & expertise</h3>
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
          hint="Choose from the My Tutoring Hub subject catalog. Search or tap a subject — no free typing."
        />

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
              ? "Skills are matched to the subjects you selected. Add more for exam technique, SEN, or crash courses."
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
          hint="Tap every stage you teach. Use Add more for board years and extra curricula."
        />

        <CatalogMultiSelect
          label="Languages"
          selected={languageList}
          onChange={setLanguageList}
          options={languageCatalog.core}
          extraOptions={languageCatalog.more}
          max={8}
          addLabel="Add more languages"
          hint="Languages you can teach in. Core languages are listed; add more from the full list."
        />
      </section>

      <section className="form-section">
        <h3>Lessons</h3>
        <label>
          <span>
            Hourly rate (PKR) <abbr className="req" title="Required">*</abbr>
          </span>
          <input
            name="hourlyRate"
            type="number"
            min={500}
            step={100}
            required
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
            <label className="radio">
              <input
                type="checkbox"
                checked={offersFreeTrial}
                onChange={(e) => setOffersFreeTrial(e.target.checked)}
              />{" "}
              Free first lesson
            </label>
          </div>
        </fieldset>

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

      <section className="form-section">
        <h3>Background</h3>
        <label>
          Qualifications
          <textarea
            name="qualifications"
            rows={3}
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            placeholder="MSc Chemistry, examiner experience, teaching licence…"
          />
        </label>
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
          <span className="field-hint">How long you have been teaching or tutoring.</span>
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

      <section className="form-section">
        <h3>Optional</h3>
        <label>
          Intro video link
          <input
            name="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube or Vimeo URL"
            inputMode="url"
          />
          <span className="field-hint">Paste a YouTube or Vimeo link. A preview appears below.</span>
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
          <span className="field-hint">
            Introduction video URL (YouTube, Vimeo, or direct video link). Shown on your public profile.
          </span>
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
        ) : videoUrl.trim() ? (
          <p className="muted">Enter a full YouTube or Vimeo URL to see the video here.</p>
        ) : null}
        <label>
          Phone
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 …"
            inputMode="tel"
          />
          <span className="field-hint">
            You can update this anytime. Shown on your public profile only after you are verified.
          </span>
        </label>
      </section>

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
      <button className="btn" type="submit" disabled={uploading || saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
