"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TutorProfileForm({
  initial,
}: {
  initial: {
    headline?: string | null;
    bio: string;
    subjects: string;
    hourlyRate: number;
    location: string;
    online: boolean;
    inPerson: boolean;
    photoUrl?: string | null;
  };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      headline: String(fd.get("headline") || ""),
      bio: String(fd.get("bio")),
      subjects: String(fd.get("subjects")),
      hourlyRate: Number(fd.get("hourlyRate")),
      location: String(fd.get("location")),
      online: fd.get("online") === "on",
      inPerson: fd.get("inPerson") === "on",
      photoUrl: String(fd.get("photoUrl") || ""),
    };
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
    setMsg("Profile saved.");
    router.refresh();
  }

  return (
    <form className="stack-form" onSubmit={save}>
      <label>
        Headline
        <input name="headline" defaultValue={initial.headline || ""} />
      </label>
      <label>
        Bio
        <textarea name="bio" required minLength={20} rows={5} defaultValue={initial.bio} />
      </label>
      <label>
        Subjects (comma-separated)
        <input name="subjects" required defaultValue={initial.subjects} />
      </label>
      <label>
        Hourly rate (USD)
        <input
          name="hourlyRate"
          type="number"
          min={5}
          step={1}
          required
          defaultValue={initial.hourlyRate}
        />
      </label>
      <label>
        Location
        <input name="location" required defaultValue={initial.location} />
      </label>
      <label>
        Photo URL
        <input name="photoUrl" type="url" defaultValue={initial.photoUrl || ""} />
      </label>
      <div className="checks">
        <label className="radio">
          <input name="online" type="checkbox" defaultChecked={initial.online} /> Online
        </label>
        <label className="radio">
          <input name="inPerson" type="checkbox" defaultChecked={initial.inPerson} /> In person
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
      <button className="btn" type="submit">
        Save profile
      </button>
    </form>
  );
}
