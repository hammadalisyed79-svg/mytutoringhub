"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogMultiSelect } from "@/components/CatalogMultiSelect";
import { PhoneInput } from "@/components/PhoneInput";
import { TutorBioAiHelp } from "@/components/TutorBioAiHelp";
import { VerificationForm } from "@/components/VerificationForm";
import { countryByName } from "@/lib/markets";
import {
  availabilityTimeOptions,
  emptyAvailabilitySlot,
  EXPERIENCE_YEAR_OPTIONS,
  parseAvailability,
  serializeAvailability,
  WEEKDAYS,
  type AvailabilitySlot,
} from "@/lib/availability";
import {
  expertiseForSubjects,
  GENERIC_EXPERTISE,
  joinCsv,
  splitCsv,
  tutorLanguageOptions,
  tutorLevelOptions,
} from "@/lib/tutor-catalog";
import type { TutorWizardExtraId } from "@/lib/tutor-wizard";
import { TUTOR_WORKSPACE_BLOCKS } from "@/lib/tutor-wizard";

const TIMES = availabilityTimeOptions();

export type TutorExtraInitial = {
  name: string;
  headline?: string | null;
  subjects?: string | null;
  expertise?: string | null;
  levels?: string | null;
  languages?: string | null;
  location?: string | null;
  country?: string | null;
  experienceYears?: number | null;
  teachingMethod?: string | null;
  availability?: string | null;
  introVideoUrl?: string | null;
  phone?: string | null;
  offersFreeTrial?: boolean;
  online?: boolean;
  inPerson?: boolean;
};

const EXTRA_META: Record<TutorWizardExtraId, { title: string; hint: string }> = {
  details: {
    title: "Teaching details",
    hint: "Optional — expertise, levels, languages, and how you teach.",
  },
  schedule: {
    title: "Schedule",
    hint: "Optional — weekly availability and free first lesson.",
  },
  contact: {
    title: "Contact & video",
    hint: "Optional — private phone and intro video. Phone is never shown publicly.",
  },
  verify: {
    title: "ID verification",
    hint: "Optional — trust badge after admin review. Not required to go live.",
  },
};

export function TutorProfileExtraStep({
  blockId,
  initial,
  verified,
  extraLevels = [],
  onBack,
  onSkip,
  onSavedNext,
}: {
  blockId: TutorWizardExtraId;
  initial: TutorExtraInitial;
  verified: boolean;
  extraLevels?: string[];
  onBack: () => void;
  onSkip: () => void;
  onSavedNext: () => void;
}) {
  const router = useRouter();
  const meta = EXTRA_META[blockId];
  const levelCatalog = useMemo(() => tutorLevelOptions(extraLevels), [extraLevels]);
  const languageCatalog = useMemo(
    () => tutorLanguageOptions(initial.country || ""),
    [initial.country],
  );
  const subjectList = useMemo(() => splitCsv(initial.subjects), [initial.subjects]);
  const expertiseOptions = useMemo(() => expertiseForSubjects(subjectList), [subjectList]);
  const defaultPhoneCountry = useMemo(
    () => countryByName(initial.country || "")?.code || "PK",
    [initial.country],
  );

  const [expertiseList, setExpertiseList] = useState(splitCsv(initial.expertise));
  const [levelList, setLevelList] = useState(splitCsv(initial.levels));
  const [languageList, setLanguageList] = useState(splitCsv(initial.languages));
  const [experienceYears, setExperienceYears] = useState(
    initial.experienceYears == null ? "" : String(initial.experienceYears),
  );
  const [teachingMethod, setTeachingMethod] = useState(initial.teachingMethod || "");
  const [slots, setSlots] = useState<AvailabilitySlot[]>(() =>
    parseAvailability(initial.availability),
  );
  const [offersFreeTrial, setOffersFreeTrial] = useState(Boolean(initial.offersFreeTrial));
  const [introVideoUrl, setIntroVideoUrl] = useState(initial.introVideoUrl || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function updateSlot(index: number, patch: Partial<AvailabilitySlot>) {
    setSlots((current) => current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function payload(): Record<string, unknown> | null {
    switch (blockId) {
      case "details":
        return {
          expertise: joinCsv(expertiseList),
          levels: joinCsv(levelList),
          languages: joinCsv(languageList),
          experienceYears: experienceYears === "" ? null : Number(experienceYears),
          teachingMethod: teachingMethod.trim(),
          wizardStep: "details",
        };
      case "schedule":
        return {
          availability: serializeAvailability(slots),
          offersFreeTrial,
          wizardStep: "schedule",
        };
      case "contact":
        return {
          introVideoUrl: introVideoUrl.trim(),
          phone: phone.trim(),
          wizardStep: "contact",
        };
      case "verify":
        return null;
      default:
        return null;
    }
  }

  async function saveAndNext() {
    if (blockId === "verify") {
      onSavedNext();
      return;
    }
    const body = payload();
    if (!body) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/profile/tutor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Could not save. Try again.");
        return;
      }
      setMsg("Saved.");
      router.refresh();
      onSavedNext();
    } catch {
      setError("Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tutor-workspace-block-panel stack-form">
      <header className="tutor-workspace-block-intro">
        <p className="eyebrow">Optional · Block {blockId === "details" ? 3 : blockId === "schedule" ? 4 : blockId === "contact" ? 5 : 6} of 6</p>
        <h3>{meta.title}</h3>
        <p className="muted">{meta.hint}</p>
      </header>

      {blockId === "details" ? (
        <div className="profile-advanced-block">
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
            hint="Regional languages for your teaching country appear first."
            selected={languageList}
            onChange={setLanguageList}
            options={languageCatalog.core}
            extraOptions={languageCatalog.more}
            optionsGroupLabel="Regional (priority)"
            extraGroupLabel="International (preference)"
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
              rows={3}
              maxLength={2000}
              value={teachingMethod}
              onChange={(e) => setTeachingMethod(e.target.value)}
              placeholder="Past papers, weekly homework…"
            />
          </label>
          <TutorBioAiHelp
            purpose="teachingMethod"
            bio={teachingMethod}
            name={initial.name}
            headline={initial.headline || ""}
            subjects={subjectList}
            location={initial.location || ""}
            country={initial.country || ""}
            qualifications=""
            experienceYears={
              experienceYears === "" || Number.isNaN(Number(experienceYears))
                ? null
                : Number(experienceYears)
            }
            teachingMethod=""
            languages={joinCsv(languageList)}
            levels={levelList}
            expertise={joinCsv(expertiseList)}
            online={Boolean(initial.online)}
            inPerson={Boolean(initial.inPerson)}
            onApply={setTeachingMethod}
          />
        </div>
      ) : null}

      {blockId === "schedule" ? (
        <div className="profile-advanced-block">
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
        </div>
      ) : null}

      {blockId === "contact" ? (
        <div className="profile-advanced-block">
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
              hint="Private — never shown on your public profile."
            />
          </label>
        </div>
      ) : null}

      {blockId === "verify" ? (
        verified ? (
          <p className="success">You are verified.</p>
        ) : (
          <VerificationForm embedded compact />
        )
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {msg ? <p className="success">{msg}</p> : null}

      <div className="guided-search-actions profile-wizard-actions profile-wizard-actions--sticky">
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={saving}>
          Back
        </button>
        <div className="profile-wizard-actions-right">
          <button type="button" className="btn btn-secondary" onClick={onSkip} disabled={saving}>
            Skip
          </button>
          {blockId === "verify" ? (
            <button type="button" className="btn" onClick={onSavedNext}>
              Done
            </button>
          ) : (
            <button type="button" className="btn" disabled={saving} onClick={() => void saveAndNext()}>
              {saving ? "Saving…" : "Save & next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
