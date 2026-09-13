"use client";

import { useMemo, useState } from "react";
import { CatalogMultiSelect } from "@/components/CatalogMultiSelect";
import { curriculumBoards, curriculumCodesForCapabilities } from "@/lib/curriculum";
import type { TeachingProfileEditorValues } from "@/lib/teaching-profile-dashboard";
import { tutorLevelOptions } from "@/lib/tutor-catalog";

function addUnique(list: string[], token: string) {
  if (list.some((item) => item.toLowerCase() === token.toLowerCase())) return list;
  return [...list, token];
}

export function TeachingProfileCapabilityFields({
  subject,
  extraLevels = [],
  values,
  onChange,
  compact = false,
}: {
  subject?: string;
  extraLevels?: string[];
  values: TeachingProfileEditorValues;
  onChange: (next: TeachingProfileEditorValues) => void;
  compact?: boolean;
}) {
  const [codeDraft, setCodeDraft] = useState("");
  const levelCatalog = useMemo(() => tutorLevelOptions(extraLevels), [extraLevels]);
  const boards = useMemo(() => curriculumBoards(), []);
  const codeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of curriculumCodesForCapabilities(subject, values.boards, values.levels)) {
      const code = row.code?.trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
    return out;
  }, [subject, values.boards, values.levels]);

  function addCustomCode() {
    const code = codeDraft.trim().toUpperCase();
    if (!code) return;
    onChange({ ...values, syllabusCodes: addUnique(values.syllabusCodes, code) });
    setCodeDraft("");
  }

  const fields = (
    <>
      <p className="field-hint">
        Choose levels you teach. Boards and syllabus codes are optional — add only what you use.
      </p>
      <CatalogMultiSelect
        label="Levels"
        selected={values.levels}
        onChange={(levels) => onChange({ ...values, levels })}
        options={levelCatalog.core}
        extraOptions={levelCatalog.more}
        max={12}
        addLabel="Add level"
        hint="Who you teach — school stage or typical cohort. Pick only what you actually cover."
      />
      <CatalogMultiSelect
        label="Exam boards / curricula"
        selected={values.boards}
        onChange={(boardsNext) => onChange({ ...values, boards: boardsNext })}
        options={boards}
        max={20}
        dropdownOnly
        addLabel="Add board"
        hint="Optional. Add boards you prepare for from the list."
      />
      <CatalogMultiSelect
        label="Syllabus / subject codes"
        selected={values.syllabusCodes}
        onChange={(syllabusCodes) => onChange({ ...values, syllabusCodes })}
        options={codeOptions}
        extraOptions={values.syllabusCodes}
        searchable
        dropdownOnly
        max={40}
        addLabel="Add code"
        hint="Optional. Codes students use on Past Papers (e.g. 0580, 9709). Search, then add from the list."
      />
      <label>
        Add a code not in the catalog
        <span className="catalog-add-row">
          <input
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value)}
            placeholder="e.g. 9709"
            maxLength={16}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomCode();
              }
            }}
          />
          <button className="btn btn-secondary btn-sm" type="button" onClick={addCustomCode} disabled={!codeDraft.trim()}>
            Add
          </button>
        </span>
      </label>
    </>
  );

  if (compact) {
    return (
      <details className="profile-advanced-details">
        <summary>Levels, boards &amp; syllabus codes (optional)</summary>
        <div className="profile-advanced-block">{fields}</div>
      </details>
    );
  }

  return <div className="stack-form">{fields}</div>;
}
