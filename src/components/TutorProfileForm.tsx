"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  headline?: string | null;
  bio: string;
  subjects: string;
  hourlyRate: number;
  location: string;
  online: boolean;
  inPerson: boolean;
  photoUrl?: string | null;
  qualifications?: string | null;
  teachingMethod?: string | null;
  languages?: string | null;
  levels?: string | null;
  availability?: string | null;
  videoUrl?: string | null;
  offersFreeTrial?: boolean;
  phone?: string | null;
};

export function TutorProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl || "");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900_000) {
      setError("Photo must be under ~900KB for upload");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

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
      photoUrl,
      qualifications: String(fd.get("qualifications") || ""),
      teachingMethod: String(fd.get("teachingMethod") || ""),
      languages: String(fd.get("languages") || ""),
      levels: String(fd.get("levels") || ""),
      availability: String(fd.get("availability") || ""),
      videoUrl: String(fd.get("videoUrl") || ""),
      offersFreeTrial: fd.get("offersFreeTrial") === "on",
      phone: String(fd.get("phone") || ""),
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
        Levels (e.g. Primary, GCSE, A Level, University)
        <input name="levels" defaultValue={initial.levels || ""} />
      </label>
      <label>
        Languages
        <input name="languages" defaultValue={initial.languages || ""} placeholder="English, Urdu…" />
      </label>
      <label>
        Qualifications
        <textarea name="qualifications" rows={3} defaultValue={initial.qualifications || ""} />
      </label>
      <label>
        Teaching method
        <textarea name="teachingMethod" rows={3} defaultValue={initial.teachingMethod || ""} />
      </label>
      <label>
        Availability
        <input name="availability" defaultValue={initial.availability || ""} placeholder="Weeknights, weekends…" />
      </label>
      <label>
        Intro video URL
        <input name="videoUrl" defaultValue={initial.videoUrl || ""} />
      </label>
      <label>
        Phone (shown only if verified)
        <input name="phone" defaultValue={initial.phone || ""} />
      </label>
      <label>
        Hourly rate (base units)
        <input
          name="hourlyRate"
          type="number"
          min={500}
          step={100}
          required
          defaultValue={initial.hourlyRate}
        />
      </label>
      <label>
        City / area
        <input name="location" required defaultValue={initial.location} placeholder="City or Online…" />
      </label>
      <label>
        Photo URL or upload
        <input
          value={photoUrl.startsWith("data:") ? "" : photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…"
        />
        <input type="file" accept="image/*" onChange={onFile} style={{ marginTop: "0.4rem" }} />
        {photoUrl.startsWith("data:") && <span className="muted">Image ready to save</span>}
      </label>
      <div className="checks">
        <label className="radio">
          <input name="online" type="checkbox" defaultChecked={initial.online} /> Online
        </label>
        <label className="radio">
          <input name="inPerson" type="checkbox" defaultChecked={initial.inPerson} /> In person
        </label>
        <label className="radio">
          <input name="offersFreeTrial" type="checkbox" defaultChecked={initial.offersFreeTrial} />{" "}
          Offers free first lesson
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
