"use client";

import { useMemo, useState } from "react";
import { groupByLetter } from "@/lib/tutor-catalog";

type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  selected: string[];
  onChange: (next: string[]) => void;
  options: string[];
  extraOptions?: string[];
  searchable?: boolean;
  directory?: boolean;
  max?: number;
  addLabel?: string;
  emptyHint?: string;
};

function addUnique(list: string[], token: string) {
  if (list.some((item) => item.toLowerCase() === token.toLowerCase())) return list;
  return [...list, token];
}

export function CatalogMultiSelect({
  label,
  required,
  hint,
  selected,
  onChange,
  options,
  extraOptions = [],
  searchable,
  directory,
  max = 12,
  addLabel = "Add another",
  emptyHint,
}: Props) {
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState("");
  const atMax = selected.length >= max;

  const listed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((name) => !needle || name.toLowerCase().includes(needle));
  }, [options, query]);

  const groups = useMemo(() => (directory ? groupByLetter(listed) : null), [directory, listed]);

  const extras = useMemo(
    () =>
      extraOptions.filter(
        (name) =>
          !options.some((opt) => opt.toLowerCase() === name.toLowerCase()) &&
          !selected.some((item) => item.toLowerCase() === name.toLowerCase()),
      ),
    [extraOptions, options, selected],
  );

  const remaining = useMemo(
    () =>
      [...options, ...extraOptions].filter(
        (name) => !selected.some((item) => item.toLowerCase() === name.toLowerCase()),
      ),
    [options, extraOptions, selected],
  );

  function toggle(name: string) {
    if (selected.some((item) => item.toLowerCase() === name.toLowerCase())) {
      onChange(selected.filter((item) => item.toLowerCase() !== name.toLowerCase()));
      return;
    }
    if (atMax) return;
    onChange(addUnique(selected, name));
  }

  function addFromSelect() {
    if (!pick || atMax) return;
    onChange(addUnique(selected, pick));
    setPick("");
  }

  return (
    <fieldset className="catalog-pick">
      <legend>
        {label}
        {required ? (
          <>
            {" "}
            <abbr className="req" title="Required">
              *
            </abbr>
          </>
        ) : null}
      </legend>
      {hint && <p className="field-hint">{hint}</p>}

      {selected.length > 0 && (
        <div className="catalog-selected" aria-label={`Selected ${label.toLowerCase()}`}>
          {selected.map((name) => (
            <button key={name} type="button" className="chip-btn is-on" onClick={() => toggle(name)}>
              {name} ×
            </button>
          ))}
        </div>
      )}

      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-label={`Search ${label}`}
        />
      )}

      {directory && groups ? (
        <div className="catalog-directory" role="group" aria-label={`All ${label.toLowerCase()}`}>
          {groups.map(([letter, names]) => (
            <div key={letter} className="catalog-letter">
              <strong>{letter}</strong>
              <div className="chip-row">
                {names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`chip-btn ${selected.some((item) => item.toLowerCase() === name.toLowerCase()) ? "is-on" : ""}`}
                    onClick={() => toggle(name)}
                    disabled={atMax && !selected.some((item) => item.toLowerCase() === name.toLowerCase())}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {listed.length === 0 && <p className="muted">No matching subjects in the catalog.</p>}
        </div>
      ) : listed.length === 0 ? (
        <p className="muted">{emptyHint || "Nothing listed yet."}</p>
      ) : (
        <div className="chip-row" role="group" aria-label={label}>
          {listed.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip-btn ${selected.some((item) => item.toLowerCase() === name.toLowerCase()) ? "is-on" : ""}`}
              onClick={() => toggle(name)}
              disabled={atMax && !selected.some((item) => item.toLowerCase() === name.toLowerCase())}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {(extras.length > 0 || remaining.length > 0) && (
        <div className="catalog-add">
          <label>
            {addLabel}
            <span className="catalog-add-row">
              <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={atMax}>
                <option value="">{atMax ? `Maximum ${max}` : "Select to add…"}</option>
                {(extras.length ? extras : remaining).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" type="button" onClick={addFromSelect} disabled={!pick || atMax}>
                Add
              </button>
            </span>
          </label>
        </div>
      )}
    </fieldset>
  );
}
