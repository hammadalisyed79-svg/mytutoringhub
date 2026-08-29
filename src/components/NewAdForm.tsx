"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatHourly, type CurrencyCode } from "@/lib/currency";

export type NewAdFormInitial = {
  subject?: string;
  level?: string;
  location?: string;
  board?: string;
  syllabusCode?: string;
  online?: boolean;
  inPerson?: boolean;
  q?: string;
};

export function NewAdForm({
  subjects,
  titlePlaceholder,
  levelPlaceholder,
  initial,
  currency = "PKR",
}: {
  subjects: string[];
  titlePlaceholder: string;
  levelPlaceholder: string;
  initial?: NewAdFormInitial;
  currency?: CurrencyCode;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subjectDefault =
    (initial?.subject && subjects.find((s) => s.toLowerCase() === initial.subject!.toLowerCase())) ||
    subjects[0] ||
    "Mathematics";
  const titleDefault = initial?.subject
    ? `${initial.subject}${initial.level ? ` ${initial.level}` : ""} tutor needed`.trim()
    : "";
  const descriptionDefault = [
    initial?.q ? `Search: ${initial.q}` : "",
    initial?.subject ? `Subject: ${initial.subject}` : "",
    initial?.level ? `Level: ${initial.level}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title")),
      subject: String(fd.get("subject")),
      level: String(fd.get("level")),
      board: String(fd.get("board") || "") || null,
      syllabusCode: String(fd.get("syllabusCode") || "") || null,
      location: String(fd.get("location")),
      description: String(fd.get("description")),
      budget: fd.get("budget") ? Number(fd.get("budget")) : null,
      online: fd.get("online") === "on",
      inPerson: fd.get("inPerson") === "on",
    };
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create request");
      return;
    }
    router.push("/ads");
    router.refresh();
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <p className="field-hint">Required fields are marked with *</p>
      <label>
        <span>
          Title <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <input
          name="title"
          required
          minLength={5}
          placeholder={titlePlaceholder}
          defaultValue={titleDefault}
        />
      </label>
      <label>
        <span>
          Subject <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <select name="subject" required defaultValue={subjectDefault}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          Level <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <input
          name="level"
          required
          placeholder={levelPlaceholder}
          defaultValue={initial?.level || ""}
        />
      </label>
      <div className="teaching-listing-grid">
        <label>
          Exam board <span className="muted">(optional)</span>
          <input name="board" placeholder="e.g. Cambridge, Edexcel" defaultValue={initial?.board || ""} />
        </label>
        <label>
          Syllabus code <span className="muted">(optional)</span>
          <input
            name="syllabusCode"
            placeholder="e.g. 5070"
            defaultValue={initial?.syllabusCode || ""}
          />
        </label>
      </div>
      <label>
        <span>
          City <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <input
          name="location"
          required
          placeholder="City or Online…"
          defaultValue={initial?.location || ""}
        />
      </label>
      <label>
        Budget per hour (PKR, optional)
        <input name="budget" type="number" min={500} step={100} placeholder="e.g. 1500" />
        <span className="field-hint">
          Enter PKR. Example: 1500 PKR shows as {formatHourly(1500, currency)} to viewers in{" "}
          {currency}.
        </span>
      </label>
      <label>
        <span>
          What you need <abbr className="req" title="Required">
            *
          </abbr>
        </span>
        <textarea
          name="description"
          required
          minLength={20}
          rows={5}
          placeholder="Goals, exam board, preferred days, online or in person…"
          defaultValue={descriptionDefault.length >= 20 ? descriptionDefault : ""}
        />
      </label>
      <fieldset className="form-fieldset">
        <legend>
          Lesson type <abbr className="req" title="Required">
            *
          </abbr>
        </legend>
        <div className="checks">
          <label className="radio">
            <input
              name="online"
              type="checkbox"
              defaultChecked={initial?.online !== false}
            />{" "}
            Online
          </label>
          <label className="radio">
            <input
              name="inPerson"
              type="checkbox"
              defaultChecked={Boolean(initial?.inPerson)}
            />{" "}
            In person
          </label>
        </div>
      </fieldset>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}
