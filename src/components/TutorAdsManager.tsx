"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FREE_TUTOR_AD_CAP } from "@/lib/types";
import { tutorLevelOptions } from "@/lib/tutor-catalog";

type Ad = {
  id: string;
  subject: string;
  title: string;
  level: string;
  location: string;
  rate: number;
  status: string;
  online: boolean;
  inPerson: boolean;
};

export function TutorAdsManager({
  subjects,
  extraLevels = [],
}: {
  subjects: string[];
  extraLevels?: string[];
}) {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/tutor-ads")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setAds(d))
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/tutor-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: String(fd.get("subject")),
        title: String(fd.get("title")),
        level: String(fd.get("level") || "All levels"),
        location: String(fd.get("location")),
        rate: Number(fd.get("rate")),
        online: fd.get("online") === "on",
        inPerson: fd.get("inPerson") === "on",
        description: String(fd.get("description") || ""),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create ad");
      return;
    }
    setMsg("Ad published.");
    e.currentTarget.reset();
    load();
    router.refresh();
  }

  async function setStatus(id: string, status: string) {
    await fetch("/api/tutor-ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
    router.refresh();
  }

  const activeCount = ads.filter((a) => a.status === "ACTIVE").length;
  const levels = useMemo(() => {
    const catalog = tutorLevelOptions(extraLevels);
    return ["All levels", ...catalog.core, ...catalog.more];
  }, [extraLevels]);

  return (
    <div>
      <p className="muted">
        Active ads: {activeCount} / {FREE_TUTOR_AD_CAP} included with Tutor Basic. Add Unlimited Ads
        to post more.
      </p>
      <form className="stack-form profile-form" onSubmit={create} style={{ marginTop: "0.75rem" }}>
        <p className="field-hint">Each ad should be one subject so students can find you in search.</p>
        <label>
          <span>
            Subject <abbr className="req" title="Required">*</abbr>
          </span>
          <select name="subject" required defaultValue="">
            <option value="" disabled>
              Select a listed subject…
            </option>
            {subjects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            Ad title <abbr className="req" title="Required">*</abbr>
          </span>
          <input name="title" required minLength={5} placeholder="A Level Maths · exam prep" />
        </label>
        <label>
          Level
          <select name="level" defaultValue="All levels">
            {levels.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            City <abbr className="req" title="Required">*</abbr>
          </span>
          <input name="location" required placeholder="City or Online" />
        </label>
        <label>
          <span>
            Hourly rate (PKR) <abbr className="req" title="Required">*</abbr>
          </span>
          <input name="rate" type="number" min={500} step={100} required />
        </label>
        <label>
          Short description
          <textarea name="description" rows={2} placeholder="What this ad covers…" />
        </label>
        <fieldset className="form-fieldset">
          <legend>Lesson type</legend>
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
        {msg && <p className="success">{msg}</p>}
        <button className="btn btn-sm" type="submit">
          Publish subject ad
        </button>
      </form>
      <div className="results" style={{ marginTop: "1rem" }}>
        {ads.map((ad) => (
          <article key={ad.id} className="ad-row">
            <strong>
              {ad.title} ({ad.status})
            </strong>
            <span className="muted">
              {ad.subject} · {ad.level} · {ad.location} · {ad.rate}
            </span>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {ad.status !== "ACTIVE" && (
                <button className="link-btn" type="button" onClick={() => setStatus(ad.id, "ACTIVE")}>
                  Activate
                </button>
              )}
              {ad.status === "ACTIVE" && (
                <button className="link-btn" type="button" onClick={() => setStatus(ad.id, "PAUSED")}>
                  Pause
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
