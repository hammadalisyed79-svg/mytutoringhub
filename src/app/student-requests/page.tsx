"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type StudentRequest = {
  id: string;
  subject: string;
  level: string;
  board: string | null;
  description: string;
  schedule: string | null;
  createdAt: string;
  student: { name: string };
};

export default function StudentRequestsPage() {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [board, setBoard] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");

  async function loadRequests(filter?: string) {
    setLoading(true);
    try {
      const url = filter
        ? `/api/student-requests?subject=${encodeURIComponent(filter)}`
        : "/api/student-requests";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      // fallback to empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/student-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, level, board: board || undefined, description, schedule: schedule || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to post request");
        return;
      }
      setFormSuccess("Request posted! Tutors can now see and respond to it.");
      setSubject(""); setLevel(""); setBoard(""); setDescription(""); setSchedule("");
      setShowForm(false);
      loadRequests(subjectFilter || undefined);
    } catch {
      setFormError("Failed to post request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadRequests(subjectFilter || undefined);
  }

  return (
    <div className="page">
      <div className="container stack">
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>Student Requests</h1>
          <button
            className="btn btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Post a Request"}
          </button>
        </div>
        <p className="section-lead">
          Students post subject requests here. Tutors can browse and message students whose subjects match.
        </p>

        {showForm && (
          <section className="panel">
            <h2>Post a Tutoring Request</h2>
            <form className="stack-form" onSubmit={handleSubmit}>
              <label>
                Subject <abbr className="req" title="Required">*</abbr>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Physics, English"
                />
              </label>
              <label>
                Level <abbr className="req" title="Required">*</abbr>
                <input
                  required
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="e.g. A Level, GCSE, O Level"
                />
              </label>
              <label>
                Board / Curriculum
                <input
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  placeholder="e.g. Cambridge, Edexcel, AQA"
                />
              </label>
              <label>
                Description <abbr className="req" title="Required">*</abbr>
                <textarea
                  required
                  minLength={10}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need help with, your current level, and any goals."
                />
              </label>
              <label>
                Preferred Schedule
                <input
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="e.g. Weekends, evenings after 6pm"
                />
              </label>
              {formError && <p className="form-error">{formError}</p>}
              {formSuccess && <p className="success">{formSuccess}</p>}
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? "Posting…" : "Post Request"}
              </button>
              <p className="muted" style={{ margin: 0, fontSize: "0.85em" }}>
                You must be signed in as a student to post a request.
              </p>
            </form>
          </section>
        )}

        {formSuccess && !showForm && (
          <p className="success panel">{formSuccess}</p>
        )}

        <form onSubmit={handleFilterSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            placeholder="Filter by subject…"
            style={{ flex: 1, minWidth: "200px" }}
          />
          <button className="btn btn-secondary btn-sm" type="submit">
            Filter
          </button>
          {subjectFilter && (
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => { setSubjectFilter(""); loadRequests(); }}
            >
              Clear
            </button>
          )}
        </form>

        {loading ? (
          <p className="muted">Loading requests…</p>
        ) : requests.length === 0 ? (
          <div className="panel empty-state">
            <h2>No requests yet</h2>
            <p className="muted">
              {subjectFilter
                ? `No student requests found for "${subjectFilter}".`
                : "No student requests have been posted yet. Be the first!"}
            </p>
            <button className="btn" onClick={() => setShowForm(true)}>
              Post a Request
            </button>
          </div>
        ) : (
          <div className="results">
            {requests.map((r) => (
              <article key={r.id} className="ad-row">
                <div>
                  <strong>{r.subject}</strong>
                  {" · "}
                  <span className="muted">{r.level}</span>
                  {r.board && <span className="muted"> · {r.board}</span>}
                </div>
                <p style={{ margin: "0.35rem 0" }}>{r.description.slice(0, 200)}{r.description.length > 200 ? "…" : ""}</p>
                <div className="meta muted" style={{ gap: "1rem", display: "flex", flexWrap: "wrap" }}>
                  {r.schedule && <span>Schedule: {r.schedule}</span>}
                  <span>Posted by {r.student.name}</span>
                  <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <Link href={`/messages?subject=${encodeURIComponent(r.subject)}`} className="btn btn-secondary btn-sm">
                    Respond
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
