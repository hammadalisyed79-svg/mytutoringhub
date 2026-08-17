"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FREE_TUTOR_AD_CAP } from "@/lib/types";

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

export function TutorAdsManager() {
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

  return (
    <div>
      <p className="muted">
        Active ads: {activeCount} / {FREE_TUTOR_AD_CAP} (or unlimited with Unlimited Ads plan)
      </p>
      <form className="stack-form" onSubmit={create} style={{ marginTop: "0.75rem" }}>
        <label>
          Subject
          <input name="subject" required />
        </label>
        <label>
          Title
          <input name="title" required minLength={5} />
        </label>
        <label>
          Level
          <input name="level" defaultValue="All levels" />
        </label>
        <label>
          Location
          <input name="location" required placeholder="City or Online" />
        </label>
        <label>
          Rate
          <input name="rate" type="number" min={500} step={100} required />
        </label>
        <label>
          Description
          <textarea name="description" rows={2} />
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
