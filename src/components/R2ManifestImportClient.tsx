"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type JobItem = {
  id: string;
  originalFilename: string;
  sourceUrl: string | null;
  status: string;
  year: number | null;
  session: string | null;
  subject: string | null;
  board: string | null;
  syllabusCode: string | null;
  componentCode: string | null;
  documentType: string | null;
  error: string | null;
  selected: boolean;
};

type Job = {
  id: string;
  status: string;
  source: string;
  totalItems: number;
  newCount: number;
  existsCount: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  items: JobItem[];
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function R2ManifestImportClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    if (!job) return [];
    const map = new Map<string, JobItem[]>();
    for (const item of job.items) {
      const key = [item.syllabusCode || "x", item.year || "x", item.session || "x", item.componentCode || "x"].join(
        "-",
      );
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [job]);

  function applyJob(next: Job) {
    setJob(next);
    const initial: Record<string, boolean> = {};
    for (const item of next.items) initial[item.id] = item.status === "NEW" || item.status === "ALREADY_EXISTS";
    setSelected(initial);
  }

  async function previewJson(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData(form);
      fd.set("action", "preview");
      const res = await fetch("/api/admin/past-papers/manifest", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Manifest preview failed");
      applyJob(data as Job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manifest preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function previewR2() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/past-papers/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview-r2" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "R2 sync preview failed");
      applyJob(data as Job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "R2 sync preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!job) return;
    const itemIds = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (!itemIds.length) {
      setError("Select at least one paper");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/past-papers/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", jobId: job.id, itemIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Commit failed");
      applyJob(data as Job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>R2 Chemistry 0620 (metadata only)</h2>
      <p className="muted">
        Import Cloudflare R2 object keys into the catalog. PDFs stay in R2 — this does not download or re-upload
        files. Dry-run first, then commit. Years 2016–2025, syllabus 0620.
      </p>
      <form className="stack-form" onSubmit={previewJson}>
        <label>
          Manifest JSON
          <input name="manifest" type="file" accept="application/json,.json" />
        </label>
        <div className="admin-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Working…" : "Preview JSON"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={previewR2} disabled={busy}>
            {busy ? "Working…" : "Sync from R2 (0620)"}
          </button>
        </div>
      </form>
      {error ? <p className="form-error">{error}</p> : null}

      {job ? (
        <>
          <p className="muted" style={{ marginTop: "1rem" }}>
            Job {job.id.slice(0, 8)} · {job.status} · {job.totalItems} files · New {job.newCount} · Already exists{" "}
            {job.existsCount} · Needs review {job.skippedCount} · Failed {job.failedCount} · Imported {job.importedCount}
          </p>
          <div className="admin-actions" style={{ marginBottom: "0.75rem" }}>
            <button className="btn" type="button" onClick={commit} disabled={busy}>
              {busy ? "Committing…" : "Commit selected"}
            </button>
            <Link href={`/admin/past-papers/imports/${job.id}`}>Open job</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Year</th>
                  <th>Session</th>
                  <th>Component</th>
                  <th>Type</th>
                  <th>Filename</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped.flatMap(([, items]) =>
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[item.id])}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                          aria-label={`Select ${item.originalFilename}`}
                        />
                      </td>
                      <td>{item.year || "—"}</td>
                      <td>{item.session || "—"}</td>
                      <td>{item.componentCode || "—"}</td>
                      <td>{item.documentType ? statusLabel(item.documentType) : "—"}</td>
                      <td>
                        {item.originalFilename}
                        {item.error ? <div className="muted">{item.error}</div> : null}
                      </td>
                      <td>
                        <span className={`import-status import-status-${item.status.toLowerCase()}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
