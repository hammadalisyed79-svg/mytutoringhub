"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { DOCUMENT_TYPE_LABELS } from "@/lib/past-papers/constants";

type SourceOption = { id: string; label: string; enabled: boolean };

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

const SESSIONS = ["Feb/Mar", "May/Jun", "Oct/Nov"];

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function PastPaperImportClient({
  boards,
  levels,
  subjects,
  sources,
}: {
  boards: string[];
  levels: string[];
  subjects: string[];
  sources: SourceOption[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [source, setSource] = useState("MANUAL_UPLOAD");
  const enabled = sources.find((row) => row.id === source)?.enabled ?? false;

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

  async function scan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData(form);
      const res = await fetch("/api/admin/past-papers/scan", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Scan failed");
      const next = data as Job;
      setJob(next);
      const initial: Record<string, boolean> = {};
      for (const item of next.items) initial[item.id] = item.status === "NEW";
      setSelected(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function importSelected() {
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
      const res = await fetch("/api/admin/past-papers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, itemIds, replaceExisting }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Import failed");
      const next = data as Job;
      setJob(next);
      const initial: Record<string, boolean> = {};
      for (const item of next.items) initial[item.id] = item.status === "NEW";
      setSelected(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function selectAllNew() {
    if (!job) return;
    const next: Record<string, boolean> = {};
    for (const item of job.items) next[item.id] = item.status === "NEW";
    setSelected(next);
  }

  return (
    <>
      <section className="panel">
        <h2>Scan available papers</h2>
        <p className="muted">
          Scan parses filenames and checks duplicates. It does not publish papers. Use file upload or a list of
          specific HTTPS PDF URLs you are allowed to host. Exam-board scrapers are not enabled.
        </p>
        <form className="stack-form" onSubmit={scan}>
          <div className="filters filters-wide">
            <label>
              Board
              <select name="board" defaultValue="">
                <option value="">Any</option>
                {boards.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Qualification / level
              <select name="qualification" defaultValue="">
                <option value="">Any</option>
                {levels.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <select name="subject" defaultValue="">
                <option value="">Any</option>
                {subjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject code
              <input name="subjectCode" placeholder="0620 or CIGC-IGCSE-CHEM" />
            </label>
            <label>
              From year
              <input name="yearFrom" type="number" min={1990} max={2035} placeholder="2016" />
            </label>
            <label>
              To year
              <input name="yearTo" type="number" min={1990} max={2035} placeholder="2025" />
            </label>
            <label>
              Session
              <select name="session" defaultValue="">
                <option value="">Any</option>
                {SESSIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Document type
              <select name="documentType" defaultValue="">
                <option value="">Any</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source
              <select name="source" value={source} onChange={(e) => setSource(e.target.value)}>
                {sources.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                    {row.enabled ? "" : " (not enabled)"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {source === "MANUAL_UPLOAD" && (
            <label>
              PDF files or folder
              <input name="files" type="file" accept="application/pdf" multiple required={source === "MANUAL_UPLOAD"} />
            </label>
          )}
          {source === "URL_LIST" && (
            <label>
              HTTPS PDF URLs (one per line)
              <textarea name="urlsText" rows={6} placeholder="https://example.com/0620_s24_qp_42.pdf" />
            </label>
          )}
          {!enabled && (
            <p className="form-error">
              {sources.find((row) => row.id === source)?.label} is not enabled: no permitted public API.
            </p>
          )}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy || !enabled}>
            {busy ? "Scanning…" : "Scan available papers"}
          </button>
        </form>
      </section>

      {job ? (
        <section className="panel">
          <h2>Preview</h2>
          <p className="muted">
            Job {job.id.slice(0, 8)} · {job.status} · {job.totalItems} files · New {job.newCount} · Already exists{" "}
            {job.existsCount} · Needs review {job.skippedCount} · Failed {job.failedCount} · Imported {job.importedCount}
          </p>
          <div className="admin-actions" style={{ marginBottom: "0.75rem" }}>
            <button className="btn btn-sm" type="button" onClick={selectAllNew} disabled={busy}>
              Select all new
            </button>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              Replace existing files
            </label>
            <button className="btn btn-sm" type="button" onClick={importSelected} disabled={busy}>
              {busy ? "Importing…" : "Import selected"}
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
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Component</th>
                  <th>Type</th>
                  <th>Filename</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped.flatMap(([, items]) =>
                  items.map((item, index) => (
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
                      <td>
                        {item.subject || "—"}
                        {index === 0 && items.length > 1 ? (
                          <div className="muted">Grouped with {items.length} files for this paper</div>
                        ) : null}
                      </td>
                      <td>{item.syllabusCode || "—"}</td>
                      <td>{item.componentCode || "—"}</td>
                      <td>{item.documentType ? statusLabel(item.documentType) : "—"}</td>
                      <td>
                        {item.originalFilename}
                        {item.error ? <div className="muted">{item.error}</div> : null}
                      </td>
                      <td className="muted">{item.sourceUrl ? "URL" : "Upload"}</td>
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
        </section>
      ) : null}
    </>
  );
}
