"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; status: string; docUrls: string; notes?: string | null; createdAt: string };

export function VerificationForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/verification")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setItems(d))
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docUrls: String(fd.get("docUrls")),
        notes: String(fd.get("notes") || ""),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    setMsg("Verification request submitted.");
    router.refresh();
    setItems((prev) => [data, ...prev]);
    e.currentTarget.reset();
  }

  return (
    <div>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Document links (ID, certificates — one URL per line or comma-separated)
          <textarea name="docUrls" required minLength={5} rows={3} placeholder="https://…" />
        </label>
        <label>
          Notes for reviewers
          <textarea name="notes" rows={2} />
        </label>
        {error && <p className="form-error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button className="btn btn-sm" type="submit">
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
