"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approvedSlots,
  buildVerificationDocUrls,
  filesForSlot,
  formatVerifySlotLabel,
  ID_TYPES,
  idNeedsBack,
  parseVerificationDocs,
  verificationSubmitError,
  type IdType,
  type VerifySlot,
} from "@/lib/verification-docs";

type Item = { id: string; status: string; docUrls: string; notes?: string | null; createdAt: string };
type Sides = { front: string; back: string };

const SLOTS: {
  key: VerifySlot;
  title: string;
  required: boolean;
  help: string;
}[] = [
  {
    key: "id",
    title: "Government photo ID",
    required: true,
    help: "Passport, national ID / CNIC, or driving licence. Name and photo must be readable.",
  },
  {
    key: "qualification",
    title: "Highest qualification",
    required: false,
    help: "Degree, board certificate, A Levels, or equivalent — recommended. Add the back if the document has two sides.",
  },
  {
    key: "teaching",
    title: "Teaching or subject certificate",
    required: false,
    help: "Optional. CELTA, teaching licence, or a subject credential. Add the back if it is a two-sided card.",
  },
];

function emptySides(): Sides {
  return { front: "", back: "" };
}

export function VerificationForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [idType, setIdType] = useState<IdType>("Passport");
  const [files, setFiles] = useState<Record<VerifySlot, Sides>>({
    id: emptySides(),
    qualification: emptySides(),
    teaching: emptySides(),
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const accepted = useMemo(() => approvedSlots(items), [items]);
  const pending = items.find((item) => item.status === "PENDING");
  const idLocked = accepted.locked.has("id");
  const needsIdBack = !idLocked && idNeedsBack(idType);

  useEffect(() => {
    fetch("/api/verification")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d)) return;
        setItems(d);
        const pendingItem = (d as Item[]).find((item) => item.status === "PENDING");
        if (!pendingItem) return;
        const docs = parseVerificationDocs(pendingItem.docUrls);
        const id = filesForSlot(docs, "id");
        const qualification = filesForSlot(docs, "qualification");
        const teaching = filesForSlot(docs, "teaching");
        setFiles({
          id: { front: id.front, back: id.back },
          qualification: { front: qualification.front, back: qualification.back },
          teaching: { front: teaching.front, back: teaching.back },
        });
        if (id.idType) setIdType(id.idType);
      })
      .catch(() => undefined);
  }, []);

  async function onFile(slot: VerifySlot, side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) {
    if (accepted.locked.has(slot)) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusyKey(`${slot}-${side}`);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setFiles((prev) => ({ ...prev, [slot]: { ...prev[slot], [side]: data.url } }));
      setMsg("File attached. Submit when the required sides are ready.");
    } catch {
      setError("Upload failed");
    } finally {
      setBusyKey(null);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    const payload = {
      idType,
      id: idLocked ? { front: "", back: "" } : files.id,
      qualification: accepted.locked.has("qualification") ? emptySides() : files.qualification,
      teaching: accepted.locked.has("teaching") ? emptySides() : files.teaching,
      skipId: idLocked,
    };
    const problem = verificationSubmitError(payload);
    if (problem) {
      setError(problem);
      return;
    }
    const docUrls = buildVerificationDocUrls(payload);
    if (!docUrls.trim()) {
      setError("Attach at least one new document to submit.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docUrls,
        notes: String(fd.get("notes") || ""),
        idType,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit");
      return;
    }
    setMsg(
      pending
        ? "Pending request updated. We only use these files to review your badge."
        : "Verification request submitted. We only use these files to review your badge.",
    );
    if (!pending) {
      setFiles({ id: emptySides(), qualification: emptySides(), teaching: emptySides() });
    }
    router.refresh();
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== data.id);
      return [data, ...next];
    });
  }

  const allLocked = accepted.locked.has("id") && accepted.locked.has("qualification") && accepted.locked.has("teaching");
  const canSubmitMore = !allLocked;

  return (
    <div>
      <div className="verify-summary">
        <p className="muted" style={{ marginTop: 0 }}>
          Documents are reviewed by an admin and are <strong>not</strong> shown on your public
          profile. Clear photos or PDFs, max 2MB each. Accepted files cannot be changed.
        </p>
        <ul className="check-list">
          <li>
            <strong>Required:</strong> government photo ID — passport photo page, or national ID /
            driving licence <em>front and back</em>
          </li>
          <li>
            <strong>Recommended:</strong> highest qualification certificate
          </li>
          <li>
            <strong>Optional:</strong> teaching or subject certificate
          </li>
        </ul>
      </div>

      {canSubmitMore && (
        <form className="stack-form profile-form" onSubmit={submit}>
          {SLOTS.map((slot) => {
            const locked = accepted.locked.has(slot.key);
            const acceptedFiles = accepted.files[slot.key];
            const current = files[slot.key];
            const showBack = slot.key === "id" ? needsIdBack : true;
            const backRequired = slot.key === "id" && needsIdBack;
            return (
              <div key={slot.key} className={`verify-doc ${locked ? "is-locked" : ""}`}>
                <div className="verify-doc-head">
                  <h3>
                    {slot.title}{" "}
                    {slot.required && !idLocked && slot.key === "id" ? (
                      <abbr className="req" title="Required">
                        *
                      </abbr>
                    ) : locked ? (
                      <span className="badge">Accepted</span>
                    ) : (
                      <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                        {slot.required ? "Required" : "Recommended"}
                      </span>
                    )}
                  </h3>
                  <p className="field-hint">{slot.help}</p>
                </div>

                {locked ? (
                  <>
                    <p className="muted">This document was accepted by an admin and cannot be edited.</p>
                    <ul className="verify-files">
                      {acceptedFiles?.front && (
                        <li>
                          <a href={acceptedFiles.front} target="_blank" rel="noreferrer">
                            {formatVerifySlotLabel(slot.key, "front", acceptedFiles.idType)}
                          </a>
                        </li>
                      )}
                      {acceptedFiles?.back && (
                        <li>
                          <a href={acceptedFiles.back} target="_blank" rel="noreferrer">
                            {formatVerifySlotLabel(slot.key, "back", acceptedFiles.idType)}
                          </a>
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    {slot.key === "id" && (
                      <label>
                        ID type
                        <select value={idType} onChange={(e) => setIdType(e.target.value as IdType)}>
                          {ID_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="verify-sides">
                      <SideUpload
                        label={
                          slot.key === "id" && idType === "Passport" ? "Photo page" : "Front"
                        }
                        required={slot.key === "id" || Boolean(current.back)}
                        url={current.front}
                        busy={busyKey === `${slot.key}-front`}
                        onChange={(e) => onFile(slot.key, "front", e)}
                      />
                      {showBack && (
                        <SideUpload
                          label="Back"
                          required={backRequired}
                          url={current.back}
                          busy={busyKey === `${slot.key}-back`}
                          optionalHint={
                            slot.key !== "id" ? "Required if this document has two sides" : undefined
                          }
                          onChange={(e) => onFile(slot.key, "back", e)}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

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
          <button className="btn" type="submit" disabled={busyKey !== null}>
            {pending ? "Update pending request" : "Submit for review"}
          </button>
        </form>
      )}

      {allLocked && (
        <p className="success">All submitted documents have been accepted. They cannot be changed.</p>
      )}

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

function SideUpload({
  label,
  required,
  url,
  busy,
  optionalHint,
  onChange,
}: {
  label: string;
  required: boolean;
  url: string;
  busy: boolean;
  optionalHint?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="verify-side">
      <strong>
        {label}
        {required ? (
          <>
            {" "}
            <abbr className="req" title="Required">
              *
            </abbr>
          </>
        ) : (
          <span className="muted"> (if needed)</span>
        )}
      </strong>
      {optionalHint && !required && <p className="field-hint">{optionalHint}</p>}
      <label className="btn btn-secondary btn-sm profile-upload-btn">
        {busy ? "Uploading…" : url ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        <input type="file" accept="image/*,application/pdf" hidden disabled={busy} onChange={onChange} />
      </label>
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          View {label.toLowerCase()}
        </a>
      )}
    </div>
  );
}
