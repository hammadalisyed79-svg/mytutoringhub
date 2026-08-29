"use client";

import { useMemo, useState } from "react";
import type { PastPaperFilterTree } from "@/lib/past-papers/browse";
import { DOCUMENT_TYPE_LABELS } from "@/lib/past-papers/constants";
import { PAST_PAPER_YEARS } from "@/lib/past-papers";

const SESSIONS = [
  "Feb/Mar",
  "May/Jun",
  "Oct/Nov",
  "January",
  "June",
  "October",
  "November",
] as const;

function treeKey(...parts: string[]) {
  return parts.join("\u0001");
}

export type PastPaperSearchValues = {
  q?: string;
  country?: string;
  board?: string;
  level?: string;
  subject?: string;
  code?: string;
  year?: string;
  paper?: string;
  session?: string;
  documentType?: string;
};

export function PastPaperSearchForm({
  tree,
  initial,
  pinnedCountry,
}: {
  tree: PastPaperFilterTree;
  initial: PastPaperSearchValues;
  pinnedCountry?: string | null;
}) {
  const defaultCountry =
    initial.country ||
    (pinnedCountry === "PK" ? "Pakistan" : pinnedCountry === "AE" ? "United Arab Emirates" : "");

  const [country, setCountry] = useState(defaultCountry);
  const [board, setBoard] = useState(initial.board || "");
  const [level, setLevel] = useState(initial.level || "");
  const [subject, setSubject] = useState(initial.subject || "");

  const boardOptions = useMemo(() => (country ? tree.boards[country] || [] : []), [country, tree.boards]);
  const levelOptions = useMemo(
    () => (country && board ? tree.levels[treeKey(country, board)] || [] : []),
    [country, board, tree.levels],
  );
  const subjectOptions = useMemo(() => {
    if (!country || !board) return [];
    if (level) return tree.subjects[treeKey(country, board, level)] || [];
    const merged = new Set<string>();
    for (const name of levelOptions) {
      for (const item of tree.subjects[treeKey(country, board, name)] || []) {
        merged.add(item);
      }
    }
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [country, board, level, levelOptions, tree.subjects]);

  function onCountryChange(next: string) {
    setCountry(next);
    setBoard("");
    setLevel("");
    setSubject("");
  }

  function onBoardChange(next: string) {
    setBoard(next);
    setLevel("");
    setSubject("");
  }

  function onLevelChange(next: string) {
    setLevel(next);
    setSubject("");
  }

  return (
    <form className="panel filters filters-wide" method="get">
      <label>
        Search
        <input name="q" defaultValue={initial.q || ""} placeholder="Chemistry, 0620, paper 42" />
      </label>
      <label>
        Country
        <select
          name="country"
          value={country}
          onChange={(event) => onCountryChange(event.target.value)}
          aria-label="Country"
        >
          <option value="">Any country</option>
          {tree.countries.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Board
        <select
          name="board"
          value={board}
          onChange={(event) => onBoardChange(event.target.value)}
          disabled={!country}
          aria-label="Board"
        >
          <option value="">{country ? "Any board" : "Choose country first"}</option>
          {boardOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Qualification
        <select
          name="level"
          value={level}
          onChange={(event) => onLevelChange(event.target.value)}
          disabled={!country || !board}
          aria-label="Qualification"
        >
          <option value="">{board ? "Any qualification" : "Choose board first"}</option>
          {levelOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subject
        <select
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={!country || !board}
          aria-label="Subject"
        >
          <option value="">{board ? "Any subject" : "Choose board first"}</option>
          {subjectOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Code
        <input name="code" defaultValue={initial.code || ""} placeholder="0620 (Cambridge syllabus code)" />
      </label>
      <label>
        Year
        <select name="year" defaultValue={initial.year || ""}>
          <option value="">Any</option>
          {PAST_PAPER_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label>
        Paper code
        <input name="paper" defaultValue={initial.paper || ""} placeholder="Paper number" aria-label="Paper / component" />
      </label>
      <label>
        Session
        <select name="session" defaultValue={initial.session || ""}>
          <option value="">Any</option>
          {SESSIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Document type
        <select name="documentType" defaultValue={initial.documentType || ""}>
          <option value="">Any</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button className="btn" type="submit">
        Search
      </button>
    </form>
  );
}
