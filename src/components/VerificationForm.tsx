"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; status: string; docUrls: string; notes?: string | null; createdAt: string };

export function VerificationForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [docUrls, setDocUrls] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/verification")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setItems(d))
      .catch(() => undefined);
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setDocUrls((prev) => (prev.trim() ? `${prev.trim()}\n${data.url}` : data.url));
      setMsg("File uploaded. Add notes and submit when ready.");
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docUrls,
        notes: String(fd.get("notes") || ""),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    setMsg("Verification request submitted.");
    setDocUrls("");
    router.refresh();
    setItems((prev) => [data, ...prev]);
    e.currentTarget.reset();
  }

  return (
    <div>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Document links (ID, certificates — one URL per line)
          <textarea
            name="docUrls"
            required
            minLength={5}
            rows={3}
            placeholder="https://…"
            value={docUrls}
            onChange={(e) => setDocUrls(e.target.value)}
          />
        </label>
        <label>
          Or upload a file (image or PDF, max 2MB)
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onFile}
            disabled={uploading}
          />
          {uploading && <span className="muted">Uploading…</span>}
        </label>
        <label>
          Notes for reviewers
          <textarea name="notes" rows={2} />
        </label>
        {error && <p className="form-error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button className="btn btn-sm" type="submit" disabled={uploading}>
          Request verification
        </button>
      </form>
      {items.length > 0 && (
        <ul className="sub-list" style={{ marginTop: "1rem" }}>
          {items.map((i) => (
            <li key={i.id}>
              {i.status} · {new Date(i.createdAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
