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

const REVIEW_STEP = SLOTS.length;

function emptySides(): Sides {
  return { front: "", back: "" };
}

export function VerificationForm({
  embedded = false,
  compact = false,
}: {
  /** Render without nested <form> so it can sit inside the profile wizard. */
  embedded?: boolean;
  /** Shorter copy when the parent wizard chrome already explains the step. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [idType, setIdType] = useState<IdType>("Passport");
  const [files, setFiles] = useState<Record<VerifySlot, Sides>>({
    id: emptySides(),
    qualification: emptySides(),
    teaching: emptySides(),
  });
  const [notes, setNotes] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [docStep, setDocStep] = useState(0);

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
      setMsg("File attached.");
    } catch {
      setError("Upload failed");
    } finally {
      setBusyKey(null);
      e.target.value = "";
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
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
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docUrls,
        notes: notes.trim(),
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
      setNotes("");
    }
    router.refresh();
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== data.id);
      return [data, ...next];
    });
  }

  const allLocked =
    accepted.locked.has("id") && accepted.locked.has("qualification") && accepted.locked.has("teaching");
  const canSubmitMore = !allLocked;
  const totalDocSteps = REVIEW_STEP + 1;
  const onReview = docStep >= REVIEW_STEP;
  const activeSlot = !onReview ? SLOTS[docStep] : null;
  const progressPct = Math.round(((docStep + 1) / totalDocSteps) * 100);

  function validateCurrentDoc(): string | null {
    if (!activeSlot || activeSlot.key !== "id" || idLocked) return null;
    if (!files.id.front) return "Upload your ID photo page / front to continue, or skip verification from the profile wizard.";
    if (needsIdBack && !files.id.back) return "This ID type needs the back side as well.";
    return null;
  }

  function goNextDoc() {
    setError("");
    setMsg("");
    const problem = validateCurrentDoc();
    if (problem) {
      setError(problem);
      return;
    }
    setDocStep((s) => Math.min(s + 1, REVIEW_STEP));
  }

  function skipDoc() {
    if (!activeSlot || activeSlot.required) return;
    setError("");
    setMsg("");
    setDocStep((s) => Math.min(s + 1, REVIEW_STEP));
  }

  function renderSlot(slot: (typeof SLOTS)[number]) {
    const locked = accepted.locked.has(slot.key);
    const acceptedFiles = accepted.files[slot.key];
    const current = files[slot.key];
    const showBack = slot.key === "id" ? needsIdBack : true;
    const backRequired = slot.key === "id" && needsIdBack;
    return (
      <div className={`verify-doc ${locked ? "is-locked" : ""}`}>
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
                {slot.required ? "Required for badge" : "Recommended"}
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
                label={slot.key === "id" && idType === "Passport" ? "Photo page" : "Front"}
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
                  optionalHint={slot.key !== "id" ? "Required if this document has two sides" : undefined}
                  onChange={(e) => onFile(slot.key, "back", e)}
                />
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const body = canSubmitMore ? (
    <div className="verify-wizard">
      <div className="guided-search-progress" aria-hidden="true">
        <div className="guided-search-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="guided-search-step muted">
        Document {Math.min(docStep + 1, totalDocSteps)} of {totalDocSteps}
        {activeSlot ? (activeSlot.required ? " · Required for badge" : " · Optional") : " · Submit"}
      </p>

      {!onReview && activeSlot ? renderSlot(activeSlot) : null}

      {onReview ? (
        <>
          <p className="muted">
            Review and submit. You can go back to change uploads. Documents stay private — admins only.
          </p>
          <ul className="check-list verify-review-list">
            {SLOTS.map((slot) => {
              const current = files[slot.key];
              const locked = accepted.locked.has(slot.key);
              const attached = locked || Boolean(current.front);
              return (
                <li key={slot.key}>
                  {attached ? "✓" : "○"} {slot.title}
                  {!attached && !slot.required ? " (skipped)" : ""}
                </li>
              );
            })}
          </ul>
          <label>
            Notes for reviewers
            <textarea
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything that helps match the ID to your account name…"
            />
          </label>
        </>
      ) : null}

      {error && <p className="form-error">{error}</p>}
      {msg && <p className="success">{msg}</p>}

      <div className="guided-search-actions profile-wizard-actions">
        {docStep > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => setDocStep((s) => s - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        <div className="profile-wizard-actions-right">
          {activeSlot && !activeSlot.required ? (
            <button type="button" className="btn btn-secondary" onClick={skipDoc}>
              Skip for now
            </button>
          ) : null}
          {onReview ? (
            <button
              className="btn"
              type={embedded ? "button" : "submit"}
              disabled={busyKey !== null}
              onClick={embedded ? () => void submit() : undefined}
            >
              {pending ? "Update pending request" : "Submit for review"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={goNextDoc}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={compact ? "verify-form-compact" : undefined}>
      {!compact && (
        <div className="verify-summary">
          <p className="muted" style={{ marginTop: 0 }}>
            Upload one document at a time. Clear photos or PDFs, max 2MB each. Accepted files cannot
            be changed.
          </p>
        </div>
      )}

      {compact && (
        <p className="muted" style={{ marginTop: 0 }}>
          One document per screen. Skip optional certificates. You can finish verification later.
        </p>
      )}

      {canSubmitMore &&
        (embedded ? (
          <div className="stack-form profile-form">{body}</div>
        ) : (
          <form
            className="stack-form profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (onReview) void submit(e);
              else goNextDoc();
            }}
          >
            {body}
          </form>
        ))}

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
