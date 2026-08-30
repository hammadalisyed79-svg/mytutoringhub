"use client";

import { useMemo, useState } from "react";
import { CatalogMultiSelect } from "@/components/CatalogMultiSelect";
import { curriculumBoards, curriculumCodesForSubject } from "@/lib/curriculum";
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
    for (const row of curriculumCodesForSubject(subject)) {
      const code = row.code?.trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
    return out;
  }, [subject]);

  function addCustomCode() {
    const code = codeDraft.trim().toUpperCase();
    if (!code) return;
    onChange({ ...values, syllabusCodes: addUnique(values.syllabusCodes, code) });
    setCodeDraft("");
  }

  const fields = (
    <>
      <CatalogMultiSelect
        label="Levels"
        selected={values.levels}
        onChange={(levels) => onChange({ ...values, levels })}
        options={levelCatalog.core}
        extraOptions={levelCatalog.more}
        max={12}
        addLabel="Add level"
        hint="GCSE and A Level belong on the same Mathematics profile — do not create a second one."
      />
      <CatalogMultiSelect
        label="Exam boards / curricula"
        selected={values.boards}
        onChange={(boardsNext) => onChange({ ...values, boards: boardsNext })}
        options={boards}
        max={12}
        addLabel="Add board"
        hint="Optional. Cambridge, Edexcel, and others live inside this subject."
      />
      <CatalogMultiSelect
        label="Qualification stages"
        selected={values.qualifications}
        onChange={(qualifications) => onChange({ ...values, qualifications })}
        options={levelCatalog.core}
        extraOptions={levelCatalog.more}
        max={12}
        addLabel="Add qualification"
        hint="Optional. O Level, GCSE, A Level, IB, and similar."
      />
      <CatalogMultiSelect
        label="Syllabus / subject codes"
        selected={values.syllabusCodes}
        onChange={(syllabusCodes) => onChange({ ...values, syllabusCodes })}
        options={codeOptions}
        extraOptions={values.syllabusCodes}
        searchable
        max={16}
        addLabel="Add code"
        hint="Optional. e.g. 0580, 9709 — Past Papers visitors match on these."
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
