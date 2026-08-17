"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; status: string; docUrls: string; notes?: string | null; createdAt: string };

const ID_TYPES = ["Passport", "National ID / CNIC", "Driving licence"] as const;

type SlotKey = "id" | "qualification" | "teaching";

const SLOTS: {
  key: SlotKey;
  title: string;
  required: boolean;
  help: string;
}[] = [
  {
    key: "id",
    title: "Government photo ID",
    required: true,
    help: "Passport, national ID / CNIC, or driving licence. Name and photo must be readable. CNIC: front and back.",
  },
  {
    key: "qualification",
    title: "Highest qualification",
    required: false,
    help: "Degree, board certificate, A Levels, or equivalent — recommended.",
  },
  {
    key: "teaching",
    title: "Teaching or subject certificate",
    required: false,
    help: "Optional. CELTA, teaching licence, or a subject credential if you have one.",
  },
];

export function VerificationForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [idType, setIdType] = useState<(typeof ID_TYPES)[number]>("Passport");
  const [files, setFiles] = useState<Record<SlotKey, string[]>>({
    id: [],
    qualification: [],
    teaching: [],
  });
  const [busySlot, setBusySlot] = useState<SlotKey | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/verification")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setItems(d))
      .catch(() => undefined);
  }, []);

  async function onFile(slot: SlotKey, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusySlot(slot);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setFiles((prev) => ({ ...prev, [slot]: [...prev[slot], data.url] }));
      setMsg("File attached. Submit when the required ID is ready.");
    } catch {
      setError("Upload failed");
    } finally {
      setBusySlot(null);
      e.target.value = "";
    }
  }

  function buildDocUrls() {
    const lines: string[] = [];
    if (files.id.length) lines.push(`Photo ID (${idType}): ${files.id.join(" ")}`);
    if (files.qualification.length) lines.push(`Qualification: ${files.qualification.join(" ")}`);
    if (files.teaching.length) lines.push(`Teaching certificate: ${files.teaching.join(" ")}`);
    return lines.join("\n");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (files.id.length === 0) {
      setError("Upload a government photo ID (passport, national ID, or driving licence).");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docUrls: buildDocUrls(),
        notes: String(fd.get("notes") || ""),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    setMsg("Verification request submitted. We only use these files to review your badge.");
    setFiles({ id: [], qualification: [], teaching: [] });
    router.refresh();
    setItems((prev) => [data, ...prev]);
    e.currentTarget.reset();
  }

  return (
    <div>
      <div className="verify-summary">
        <p className="muted" style={{ marginTop: 0 }}>
          Documents are reviewed by an admin and are <strong>not</strong> shown on your public
          profile. Clear photos or PDFs, max 2MB each.
        </p>
        <ul className="check-list">
          <li>
            <strong>Required:</strong> government photo ID — passport, national ID / CNIC, or driving
            licence
          </li>
          <li>
            <strong>Recommended:</strong> highest qualification certificate
          </li>
          <li>
            <strong>Optional:</strong> teaching or subject certificate
          </li>
        </ul>
      </div>

      <form className="stack-form profile-form" onSubmit={submit}>
        {SLOTS.map((slot) => (
          <div key={slot.key} className="verify-doc">
            <div className="verify-doc-head">
              <h3>
                {slot.title}{" "}
                {slot.required ? (
                  <abbr className="req" title="Required">
                    *
                  </abbr>
                ) : (
                  <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                    Recommended
                  </span>
                )}
              </h3>
              <p className="field-hint">{slot.help}</p>
            </div>
            {slot.key === "id" && (
              <label>
                ID type
                <select value={idType} onChange={(e) => setIdType(e.target.value as typeof idType)}>
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="btn btn-secondary btn-sm profile-upload-btn">
              {busySlot === slot.key ? "Uploading…" : files[slot.key].length ? "Add another file" : "Upload file"}
              <input
                type="file"
                accept="image/*,application/pdf"
                hidden
                disabled={busySlot !== null}
                onChange={(e) => onFile(slot.key, e)}
              />
            </label>
            {files[slot.key].length > 0 && (
              <ul className="verify-files">
                {files[slot.key].map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      Uploaded file
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <label>
          Notes for reviewers
          <textarea
            name="notes"
            rows={2}
            placeholder="Anything that helps match the ID to your account name…"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {msg && <p className="success">{msg}</p>}
        <button className="btn" type="submit" disabled={busySlot !== null}>
          Submit for review
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
