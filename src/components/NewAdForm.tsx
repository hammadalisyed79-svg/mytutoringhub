"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewAdForm({ subjects }: { subjects: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title")),
      subject: String(fd.get("subject")),
      level: String(fd.get("level")),
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
      setError(data.error || "Could not create ad");
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
          Title <abbr className="req" title="Required">*</abbr>
        </span>
        <input name="title" required minLength={5} placeholder="Need an A Level Chemistry tutor in Lahore" />
      </label>
      <label>
        <span>
          Subject <abbr className="req" title="Required">*</abbr>
        </span>
        <select name="subject" required defaultValue={subjects[0] || "Mathematics"}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          Level <abbr className="req" title="Required">*</abbr>
        </span>
        <input name="level" required placeholder="e.g. Matric / FSc / O Level" />
      </label>
      <label>
        <span>
          City <abbr className="req" title="Required">*</abbr>
        </span>
        <input name="location" required placeholder="City or Online…" />
      </label>
      <label>
        Budget per hour (PKR, optional)
        <input name="budget" type="number" min={500} step={100} placeholder="e.g. 1500" />
        <span className="field-hint">Tutors see this converted to their local currency.</span>
      </label>
      <label>
        <span>
          What you need <abbr className="req" title="Required">*</abbr>
        </span>
        <textarea
          name="description"
          required
          minLength={20}
          rows={5}
          placeholder="Goals, exam board, preferred days, online or in person…"
        />
      </label>
      <fieldset className="form-fieldset">
        <legend>
          Lesson type <abbr className="req" title="Required">*</abbr>
        </legend>
        <div className="checks">
          <label className="radio">
            <input name="online" type="checkbox" defaultChecked /> Online
          </label>
          <label className="radio">
            <input name="inPerson" type="checkbox" /> In person
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
