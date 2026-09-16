"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

async function postAdmin(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Action failed");
  }
  return data;
}

type AdminNoteModalProps = {
  action: string;
  id: string;
  label: string;
  title: string;
  description?: string;
  noteKey?: string;
  noteLabel?: string;
  noteRequired?: boolean;
  noteMinLength?: number;
  notePlaceholder?: string;
  confirmBypassKey?: string;
  danger?: boolean;
  extra?: Record<string, unknown>;
  children?: ReactNode;
};

/**
 * High-stakes admin action with a visible note field (no window.prompt).
 */
export function AdminNoteModalButton({
  action,
  id,
  label,
  title,
  description,
  noteKey = "adminNote",
  noteLabel = "Admin note",
  noteRequired = true,
  noteMinLength = 4,
  notePlaceholder = "Reason or reference…",
  confirmBypassKey,
  danger,
  extra,
}: AdminNoteModalProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = note.trim();
    if (noteRequired && trimmed.length < noteMinLength) {
      setError(`Add a note (at least ${noteMinLength} characters).`);
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        action,
        id,
        ...extra,
        ...(noteKey ? { [noteKey]: trimmed } : {}),
      };
      if (confirmBypassKey) payload[confirmBypassKey] = true;
      await postAdmin(payload);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={danger ? "link-btn admin-danger" : "link-btn"}
        type="button"
        onClick={() => {
          setError("");
          setNote("");
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <h2 id={titleId} className="admin-modal-title">
              {title}
            </h2>
            {description ? <p className="muted admin-modal-lead">{description}</p> : null}
            <form onSubmit={submit} className="admin-modal-form">
              <label className="admin-modal-label">
                <span>
                  {noteLabel}
                  {noteRequired ? " (required)" : " (optional)"}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder={notePlaceholder}
                  autoFocus
                  disabled={busy}
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-sm${danger ? " admin-modal-danger" : ""}`}
                  disabled={busy}
                >
                  {busy ? "Working…" : label}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
