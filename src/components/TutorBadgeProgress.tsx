"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import { trustBadgeMeta, type BadgeProgress } from "@/lib/tutor-badges";

type Recommendation = {
  id: string;
  recommenderName: string;
  status: string;
  createdAt: string;
};

export function TutorBadgeProgressPanel({ progress }: { progress: BadgeProgress }) {
  return (
    <section className="panel tutor-badge-progress" style={{ marginTop: "1rem" }}>
      <div className="tutor-badge-progress-head">
        <h2 style={{ marginTop: 0 }}>Tutor badge progression</h2>
        <TutorTrustBadgePill badge={progress.current} />
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Every new tutor starts as <strong>New Tutor</strong>. Earn higher badges through verified
        off-platform recommendations and on-platform student reviews.
      </p>
      <ol className="tutor-badge-steps">
        {progress.steps.map((step) => (
          <li key={step.label} className={step.done ? "is-done" : ""}>
            <strong>{step.label}</strong>
            <span className="muted">{step.detail}</span>
          </li>
        ))}
      </ol>
      {progress.next ? (
        <p className="field-hint" style={{ marginBottom: 0 }}>
          Next: <strong>{progress.next ? trustBadgeMeta(progress.next).label : ""}</strong>
          {progress.externalNeeded > 0
            ? ` · ${progress.externalNeeded} more verified recommendation${progress.externalNeeded === 1 ? "" : "s"}`
            : ""}
          {progress.platformNeeded > 0
            ? ` · ${progress.platformNeeded} more on-platform review${progress.platformNeeded === 1 ? "" : "s"}`
            : ""}
        </p>
      ) : (
        <p className="success" style={{ marginBottom: 0 }}>
          You have reached the highest tutor badge. Thank you for outstanding teaching.
        </p>
      )}
    </section>
  );
}

export function TutorRecommendationForm() {
  const router = useRouter();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [recommenderName, setRecommenderName] = useState("");
  const [recommenderEmail, setRecommenderEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [comment, setComment] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setItems(d);
      })
      .catch(() => undefined);
  }, []);

  async function onProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setProofUrl(data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommenderName,
          recommenderEmail,
          relationship,
          comment,
          proofUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit recommendation");
        return;
      }
      setRecommenderName("");
      setRecommenderEmail("");
      setRelationship("");
      setComment("");
      setProofUrl("");
      setMsg("Recommendation submitted. Our team will verify it before it appears on your profile.");
      setItems((prev) => [data, ...prev]);
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ marginTop: "1rem" }} id="tutor-recommendations">
      <h2 style={{ marginTop: 0 }}>Off-platform recommendations</h2>
      <p className="muted">
        Ask previous students (outside My Tutoring Hub) to recommend you. Each submission is reviewed
        by our team before it counts toward <strong>Recommended</strong> and <strong>Super Tutor</strong>{" "}
        badges.
      </p>

      <form className="stack-form" onSubmit={submit}>
        <label>
          Student / parent name <abbr className="req" title="Required">*</abbr>
          <input
            value={recommenderName}
            onChange={(e) => setRecommenderName(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="Who is recommending you?"
          />
        </label>
        <label>
          Their email (optional)
          <input
            type="email"
            value={recommenderEmail}
            onChange={(e) => setRecommenderEmail(e.target.value)}
            placeholder="For verification only — not shown publicly"
          />
        </label>
        <label>
          Relationship (optional)
          <input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            maxLength={120}
            placeholder="e.g. Former A-Level student, parent"
          />
        </label>
        <label>
          Recommendation <abbr className="req" title="Required">*</abbr>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            minLength={20}
            rows={4}
            placeholder="What they said about your teaching, results, or reliability…"
          />
        </label>
        <label className="btn btn-secondary btn-sm profile-upload-btn" style={{ width: "fit-content" }}>
          {uploading ? "Uploading…" : proofUrl ? "Change supporting document" : "Attach supporting document"}
          <input type="file" accept="image/*,application/pdf" hidden onChange={onProofFile} />
        </label>
        {proofUrl && (
          <p className="field-hint" style={{ marginTop: 0 }}>
            <a href={proofUrl} target="_blank" rel="noreferrer">
              View uploaded proof
            </a>{" "}
            ·{" "}
            <button type="button" className="link-btn" onClick={() => setProofUrl("")}>
              Remove
            </button>
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button className="btn" type="submit" disabled={busy || uploading}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </form>

      {items.length > 0 && (
        <ul className="sub-list" style={{ marginTop: "1rem" }}>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.recommenderName}</strong> · {item.status} ·{" "}
              {new Date(item.createdAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
