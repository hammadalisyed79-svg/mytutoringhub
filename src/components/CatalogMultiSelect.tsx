"use client";

import { useMemo, useState } from "react";
import { SuggestField } from "@/components/SuggestField";
import { groupByLetter } from "@/lib/tutor-catalog";

type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  selected: string[];
  onChange: (next: string[]) => void;
  options: string[];
  extraOptions?: string[];
  /** Optgroup label for priority/core options in the add menu. */
  optionsGroupLabel?: string;
  /** Optgroup label for preference/extra options in the add menu. */
  extraGroupLabel?: string;
  searchable?: boolean;
  directory?: boolean;
  /** Hide the option chip cloud — selected chips + typeahead only. */
  dropdownOnly?: boolean;
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
  optionsGroupLabel,
  extraGroupLabel,
  searchable,
  directory,
  dropdownOnly = false,
  max = 12,
  addLabel = "Add another",
  emptyHint,
}: Props) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const atMax = selected.length >= max;
  const poolSize = options.length + extraOptions.length;
  const showSearch = searchable ?? poolSize >= 8;

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

  const remainingCore = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    return options.filter((name) => {
      if (selected.some((item) => item.toLowerCase() === name.toLowerCase())) return false;
      if (!needle) return true;
      return name.toLowerCase().includes(needle);
    });
  }, [options, selected, draft]);

  const remaining = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    return [...options, ...extraOptions].filter((name) => {
      if (selected.some((item) => item.toLowerCase() === name.toLowerCase())) return false;
      if (!needle) return true;
      return name.toLowerCase().includes(needle);
    });
  }, [options, extraOptions, selected, draft]);

  const suggestOptions = useMemo(() => {
    const useGrouped = Boolean(optionsGroupLabel || extraGroupLabel) && extras.length > 0;
    const source = useGrouped ? remaining : remainingCore.length ? remainingCore : remaining;
    return source.slice(0, 12).map((name) => {
      const isExtra = extras.some((item) => item.toLowerCase() === name.toLowerCase());
      return {
        value: name,
        label: name,
        hint: isExtra ? extraGroupLabel || "More" : optionsGroupLabel || undefined,
      };
    });
  }, [
    extras,
    extraGroupLabel,
    optionsGroupLabel,
    remaining,
    remainingCore,
  ]);

  function toggle(name: string) {
    if (selected.some((item) => item.toLowerCase() === name.toLowerCase())) {
      onChange(selected.filter((item) => item.toLowerCase() !== name.toLowerCase()));
      return;
    }
    if (atMax) return;
    onChange(addUnique(selected, name));
  }

  function addValue(raw: string) {
    const token = raw.trim();
    if (!token || atMax) return;
    onChange(addUnique(selected, token));
    setDraft("");
    setQuery("");
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

      {showSearch && !dropdownOnly && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-label={`Search ${label}`}
          inputMode="search"
          enterKeyHint="search"
        />
      )}

      {!dropdownOnly &&
        (directory && groups ? (
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
        ))}

      {!atMax ? (
        <div className="catalog-add catalog-add--suggest">
          <SuggestField
            name={`add-${label.toLowerCase().replace(/\s+/g, "-")}`}
            label={addLabel}
            value={draft}
            onChange={(value, option) => {
              if (option) {
                addValue(option.value);
                return;
              }
              setDraft(value);
            }}
            options={suggestOptions}
            placeholder={`Type to find ${label.toLowerCase()}…`}
          />
          {draft.trim() ? (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => addValue(draft)}
            >
              Add “{draft.trim()}”
            </button>
          ) : null}
        </div>
      ) : (
        <p className="muted">Maximum {max} selected.</p>
      )}
    </fieldset>
  );
}
