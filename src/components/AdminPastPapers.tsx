"use client";

import { useState, type FormEvent } from "react";

export function AdminPastPaperFeeForm({ feePkr }: { feePkr: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_past_paper_fee",
          pastPaperFeePkr: Number(fd.get("pastPaperFeePkr")),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Could not save fee");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save fee");
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      <label>
        Past paper download fee (PKR)
        <input
          name="pastPaperFeePkr"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={feePkr}
        />
      </label>
      <p className="muted">
        Charged once per paper in PKR (stored as the master price). Set 0 for free downloads for
        signed-in users. Students see the converted price in their currency at checkout. Default
        when unset: Rs 100.
      </p>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save download fee"}
      </button>
    </form>
  );
}

export function AdminPastPaperUpload({ catalogKey }: { catalogKey: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement)?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("catalogKey", catalogKey);
      const upload = await fetch("/api/past-papers/upload", { method: "POST", body: fd });
      const uploaded = await upload.json().catch(() => ({}));
      if (!upload.ok) throw new Error((uploaded as { error?: string }).error || "Upload failed");
      const save = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "past_paper_save",
          catalogKey,
          fileUrl: (uploaded as { url: string }).url,
          published: true,
        }),
      });
      const saved = await save.json().catch(() => ({}));
      if (!save.ok) throw new Error((saved as { error?: string }).error || "Could not save paper");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <form className="paper-upload" onSubmit={submit}>
      <input name="file" type="file" accept="application/pdf" required />
      <button className="btn btn-sm" type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Upload PDF"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
