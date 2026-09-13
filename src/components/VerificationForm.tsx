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
    help: "Passport, national ID, or driving licence — name and photo readable.",
  },
  {
    key: "qualification",
    title: "Highest qualification",
    required: false,
    help: "Degree or board certificate. Upload both sides if it is a two-sided card.",
  },
  {
    key: "teaching",
    title: "Teaching certificate",
    required: false,
    help: "CELTA, licence, or subject credential — optional.",
  },
];

const REVIEW_STEP = SLOTS.length;

function emptySides(): Sides {
  return { front: "", back: "" };
}

export function VerificationForm({
  embedded = false,
  compact = false,
  onFinishLater,
}: {
  /** Render without nested <form> so it can sit inside the profile wizard. */
  embedded?: boolean;
  /** Shorter copy when the parent wizard chrome already explains the step. */
  compact?: boolean;
  /** When set (workspace flow), show Finish later instead of relying on a second action row. */
  onFinishLater?: () => void;
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
        ? "Request updated — files stay private for badge review."
        : "Submitted for review — files stay private.",
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
    if (!files.id.front) {
      return idType === "Passport"
        ? "Upload the passport photo page before continuing."
        : "Upload the front of your ID before continuing.";
    }
    if (needsIdBack && !files.id.back) {
      return `Upload the back of your ${idType} before continuing.`;
    }
    return null;
  }

  const idReady =
    idLocked ||
    (Boolean(files.id.front.trim()) && (!needsIdBack || Boolean(files.id.back.trim())));
  const reviewBlockReason = onReview
    ? verificationSubmitError({
        idType,
        id: idLocked ? { front: "", back: "" } : files.id,
        qualification: accepted.locked.has("qualification") ? emptySides() : files.qualification,
        teaching: accepted.locked.has("teaching") ? emptySides() : files.teaching,
        skipId: idLocked,
      })
    : null;
  const currentDocBlocked = Boolean(validateCurrentDoc());

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
    const frontRequired = slot.key === "id" || Boolean(current.back);
    const frontMissing = !locked && frontRequired && !current.front;
    const backMissing = !locked && backRequired && !current.back;
    return (
      <div
        className={`verify-doc${locked ? " is-locked" : ""}${frontMissing || backMissing ? " is-incomplete" : ""}`}
      >
        <div className="verify-doc-head">
          <h3 className="verify-doc-title">
            {slot.title}
            {slot.required && !idLocked && slot.key === "id" ? (
              <>
                {" "}
                <abbr className="req" title="Required">
                  *
                </abbr>
              </>
            ) : locked ? (
              <span className="badge">Accepted</span>
            ) : !slot.required ? (
              <span className="verify-optional-tag">Optional</span>
            ) : null}
          </h3>
          <p className="field-hint">{slot.help}</p>
          {!locked && slot.key === "id" && (frontMissing || backMissing) ? (
            <p className="verify-incomplete-note" role="status">
              Required uploads are marked in red — attach them before you continue.
            </p>
          ) : null}
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
                required={frontRequired}
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
                  optionalHint={slot.key !== "id" ? "Only if the document has two sides" : undefined}
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
              const needsBack =
                slot.key === "id" && !locked && needsIdBack && !current.back && Boolean(current.front);
              const incomplete = slot.required
                ? !(locked || (Boolean(current.front) && (!needsIdBack || Boolean(current.back))))
                : needsBack;
              return (
                <li
                  key={slot.key}
                  className={attached && !needsBack ? "is-done" : incomplete ? "is-needed" : "is-skipped"}
                >
                  {attached && !needsBack ? "✓" : incomplete ? "!" : "○"} {slot.title}
                  {incomplete && slot.required
                    ? " — required, not complete"
                    : !attached && !slot.required
                      ? " (skipped)"
                      : needsBack
                        ? " — back side still needed"
                        : ""}
                </li>
              );
            })}
          </ul>
          {!idReady ? (
            <p className="form-error" role="alert">
              Government photo ID must be fully uploaded before you can submit.
            </p>
          ) : null}
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

      <div className="guided-search-actions profile-wizard-actions profile-wizard-actions--luxe">
        {docStep > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => setDocStep((s) => s - 1)}>
            Back
          </button>
        ) : onFinishLater ? (
          <button type="button" className="btn btn-secondary" onClick={onFinishLater}>
            Finish later
          </button>
        ) : (
          <span />
        )}
        <div className="profile-wizard-actions-right">
          {activeSlot && !activeSlot.required ? (
            <button type="button" className="btn btn-secondary" onClick={skipDoc}>
              Skip
            </button>
          ) : null}
          {onReview ? (
            <button
              className="btn"
              type={embedded ? "button" : "submit"}
              disabled={busyKey !== null || Boolean(reviewBlockReason) || !idReady}
              title={reviewBlockReason || (!idReady ? "Upload required ID first" : undefined)}
              onClick={embedded ? () => void submit() : undefined}
            >
              {pending ? "Update request" : "Submit for review"}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={currentDocBlocked}
              title={currentDocBlocked ? "Upload required files first" : undefined}
              onClick={goNextDoc}
            >
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
            Clear photos or PDFs · max 2MB · accepted files cannot be changed.
          </p>
        </div>
      )}

      {compact && onFinishLater ? null : compact ? (
        <p className="muted verify-compact-lead">Upload one document at a time. Skip anything optional.</p>
      ) : null}

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
  const incomplete = required && !url;
  return (
    <div className={`verify-side${incomplete ? " is-incomplete" : url ? " is-ready" : ""}`}>
      <strong className={incomplete ? "verify-side-label-incomplete" : undefined}>
        {label}
        {required ? (
          <>
            {" "}
            <abbr className="req" title="Required">
              *
            </abbr>
          </>
        ) : (
          <span className="muted verify-side-optional">Optional</span>
        )}
      </strong>
      {optionalHint && !required && <p className="field-hint">{optionalHint}</p>}
      {incomplete ? (
        <p className="verify-side-status" role="status">
          Not uploaded yet
        </p>
      ) : null}
      <label
        className={`btn btn-secondary btn-sm profile-upload-btn${incomplete ? " is-needed" : ""}`}
      >
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
