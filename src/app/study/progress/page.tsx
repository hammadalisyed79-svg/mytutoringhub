"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English Language",
  "English Literature",
  "History",
  "Geography",
  "Economics",
  "Business Studies",
  "Computer Science",
  "Urdu",
  "Islamiyat",
  "Pakistan Studies",
  "Accounting",
  "Other",
];

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3b82f6",
  Physics: "#8b5cf6",
  Chemistry: "#ec4899",
  Biology: "#10b981",
  "English Language": "#f59e0b",
  "English Literature": "#f97316",
  History: "#6366f1",
  Geography: "#14b8a6",
  Economics: "#0ea5e9",
  "Business Studies": "#d97706",
  "Computer Science": "#64748b",
  Urdu: "#a855f7",
  Islamiyat: "#22c55e",
  "Pakistan Studies": "#ef4444",
  Accounting: "#0d9488",
  Other: "#9ca3af",
};

interface StudySession {
  id: string;
  subject: string;
  duration: number;
  topic: string;
  date: string;
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDays() {
  const start = getWeekStart();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [mounted, setMounted] = useState(false);

  // Form state
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = JSON.parse(localStorage.getItem("studySessions") || "[]");
      setSessions(saved);
    } catch {}
  }, []);

  function save(updated: StudySession[]) {
    setSessions(updated);
    // TODO: persist to DB
    try {
      localStorage.setItem("studySessions", JSON.stringify(updated));
    } catch {}
  }

  function addSession() {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setError("");
    const newSession: StudySession = {
      id: Date.now().toString(),
      subject,
      duration,
      topic: topic.trim(),
      date,
    };
    save([newSession, ...sessions]);
    setTopic("");
  }

  function deleteSession(id: string) {
    save(sessions.filter((s) => s.id !== id));
  }

  function clearLog() {
    if (confirm("Clear all study log entries?")) save([]);
  }

  // Weekly data
  const weekDays = getWeekDays();
  const weekStart = isoDate(weekDays[0]);
  const weekEnd = isoDate(weekDays[6]);
  const weekSessions = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  // Hours per day
  const dayTotals = weekDays.map((d) => {
    const key = isoDate(d);
    const mins = weekSessions
      .filter((s) => s.date === key)
      .reduce((sum, s) => sum + s.duration, 0);
    return { day: d, mins };
  });

  const maxMins = Math.max(...dayTotals.map((d) => d.mins), 1);

  // Subjects this week
  const weekSubjects = [...new Set(weekSessions.map((s) => s.subject))];

  const totalWeekMins = weekSessions.reduce((sum, s) => sum + s.duration, 0);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (!mounted) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link href="/dashboard" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Dashboard
          </Link>
        </div>
        <h1 className="page-title">My Study Log 📚</h1>

        {/* Add session form */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 700 }}>Log a Study Session</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Subject
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  padding: "0.45em 0.7em",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.9rem",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Duration (minutes)
              <input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Math.max(5, Number(e.target.value)))}
                style={{
                  padding: "0.45em 0.7em",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.9rem",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  padding: "0.45em 0.7em",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.9rem",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            Topic covered
            <input
              type="text"
              placeholder="e.g. Quadratic equations, Cell division…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSession()}
              style={{
                padding: "0.45em 0.7em",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: "0.9rem",
                background: "var(--paper)",
                color: "var(--ink)",
              }}
            />
          </label>

          {error && <p style={{ color: "var(--accent)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>{error}</p>}

          <button
            onClick={addSession}
            style={{
              background: "var(--brand)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "0.45em 1.2em",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            + Add Session
          </button>
        </section>

        {/* Weekly summary */}
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              This Week&apos;s Summary
            </h2>
            <span style={{ color: "var(--brand)", fontWeight: 700, fontSize: "0.95rem" }}>
              {Math.floor(totalWeekMins / 60)}h {totalWeekMins % 60}m total
            </span>
          </div>

          {/* CSS bar chart */}
          <div className="study-bar-chart-wrap">
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-end",
              height: 120,
              marginBottom: "0.5rem",
              minWidth: "min-content",
            }}
          >
            {dayTotals.map((d, i) => {
              const heightPct = (d.mins / maxMins) * 100;
              const hrs = Math.floor(d.mins / 60);
              const mins = d.mins % 60;
              const label = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : d.mins > 0 ? `${d.mins}m` : "";
              return (
                <div
                  key={i}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                >
                  {label && (
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600 }}>
                      {label}
                    </span>
                  )}
                  <div
                    style={{
                      width: "100%",
                      flex: 1,
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(heightPct, d.mins > 0 ? 4 : 0)}%`,
                        background: d.mins > 0 ? "var(--brand)" : "var(--paper-deep)",
                        borderRadius: "4px 4px 0 0",
                        minHeight: d.mins > 0 ? 4 : 0,
                        transition: "height 0.3s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600 }}>
                    {dayLabels[i]}
                  </span>
                </div>
              );
            })}
          </div>
          </div>

          {/* Subject chips */}
          {weekSubjects.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                Subjects studied this week:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {weekSubjects.map((s) => (
                  <span
                    key={s}
                    style={{
                      background: SUBJECT_COLORS[s] ?? "#9ca3af",
                      color: "#fff",
                      borderRadius: "999px",
                      padding: "0.2em 0.75em",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {weekSessions.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
              No sessions logged this week yet. Add one above!
            </p>
          )}
        </section>

        {/* Log list */}
        {sessions.length > 0 && (
          <section style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>All Sessions</h2>
              <button
                onClick={clearLog}
                style={{
                  background: "transparent",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.3em 0.8em",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear log
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="panel"
                  style={{
                    padding: "0.65rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: SUBJECT_COLORS[s.subject] ?? "#9ca3af",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", flex: "0 0 auto" }}>{s.subject}</span>
                  <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{s.topic}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      flexShrink: 0,
                    }}
                  >
                    {s.date} · {s.duration} min
                  </span>
                  <button
                    onClick={() => deleteSession(s.id)}
                    title="Remove"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: "1rem",
                      padding: "0 0.2em",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link
            href="/study/countdown"
            style={{
              background: "var(--brand)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              padding: "0.5em 1.2em",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Exam Countdown →
          </Link>
          <Link
            href="/assistant"
            style={{
              border: "1.5px solid var(--brand)",
              color: "var(--brand)",
              borderRadius: "var(--radius-sm)",
              padding: "0.5em 1.2em",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            AI Study Assistant →
          </Link>
        </div>
      </div>
    </div>
  );
}
