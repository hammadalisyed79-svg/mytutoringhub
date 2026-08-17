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
      <label>
        Title
        <input name="title" required minLength={5} />
      </label>
      <label>
        Subject
        <select name="subject" required defaultValue={subjects[0] || "Mathematics"}>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Level
        <input name="level" required placeholder="e.g. Matric / FSc / O Level" />
      </label>
      <label>
        City
        <input name="location" required placeholder="Karachi, Lahore, Online…" />
      </label>
      <label>
        Budget per hour in PKR (optional)
        <input name="budget" type="number" min={500} step={100} placeholder="e.g. 1500" />
      </label>
      <label>
        Description
        <textarea name="description" required minLength={20} rows={5} />
      </label>
      <div className="checks">
        <label className="radio">
          <input name="online" type="checkbox" defaultChecked /> Online
        </label>
        <label className="radio">
          <input name="inPerson" type="checkbox" /> In person
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}
