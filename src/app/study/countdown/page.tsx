"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const EXAMS = [
  {
    id: "igcse-mj-2027",
    name: "Cambridge IGCSE / O-Level",
    session: "May/June 2027",
    start: new Date("2027-04-28T00:00:00"),
    board: "Cambridge",
  },
  {
    id: "igcse-on-2026",
    name: "Cambridge IGCSE / O-Level",
    session: "Oct/Nov 2026",
    start: new Date("2026-10-06T00:00:00"),
    board: "Cambridge",
  },
  {
    id: "alevel-mj-2027",
    name: "Cambridge A-Level",
    session: "May/June 2027",
    start: new Date("2027-05-05T00:00:00"),
    board: "Cambridge",
  },
  {
    id: "edexcel-jan-2027",
    name: "Edexcel IGCSE",
    session: "January 2027",
    start: new Date("2027-01-06T00:00:00"),
    board: "Edexcel",
  },
  {
    id: "aqa-mj-2027",
    name: "AQA GCSE",
    session: "May/June 2027",
    start: new Date("2027-05-12T00:00:00"),
    board: "AQA",
  },
  {
    id: "fbise-2027",
    name: "FBISE SSC / HSC Annual",
    session: "Annual 2027",
    start: new Date("2027-03-01T00:00:00"),
    board: "FBISE",
  },
  {
    id: "matric-2027",
    name: "Pakistan Matric Annual",
    session: "Annual 2027",
    start: new Date("2027-03-15T00:00:00"),
    board: "Pakistan Boards",
  },
];

const TIPS = [
  "Start each study session with a 5-minute review of yesterday's notes.",
  "Use past papers under timed conditions — it's the #1 predictor of exam success.",
  "Take a 10-minute break every 50 minutes to stay sharp.",
  "Teach a concept to a friend: if you can explain it, you truly know it.",
  "Prioritise weak topics first when you're freshest in the morning.",
  "Create a colour-coded revision timetable and stick it where you can see it.",
  "Sleep is your secret weapon — aim for 8 hours before exam day.",
];

function getTimeLeft(target: Date) {
  const now = Date.now();
  const diff = target.getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, started: false };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 52,
      }}
    >
      <span
        style={{
          fontSize: "1.6rem",
          fontWeight: 800,
          color: "var(--brand)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {pad(value)}
      </span>
      <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

function ExamCard({
  exam,
  myExams,
  onToggle,
}: {
  exam: (typeof EXAMS)[0];
  myExams: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [time, setTime] = useState(() => getTimeLeft(exam.start));

  useEffect(() => {
    const timer = setInterval(() => setTime(getTimeLeft(exam.start)), 1000);
    return () => clearInterval(timer);
  }, [exam.start]);

  const tracked = myExams.has(exam.id);

  return (
    <div
      className="panel"
      style={{
        border: tracked ? "2px solid var(--brand)" : undefined,
        position: "relative",
      }}
    >
      {tracked && (
        <span
          style={{
            position: "absolute",
            top: 0,
            right: "1rem",
            background: "var(--brand)",
            color: "#fff",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            padding: "0.15em 0.65em",
            borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
            textTransform: "uppercase",
          }}
        >
          Tracking
        </span>
      )}
      <div style={{ marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            background: "var(--paper-deep)",
            color: "var(--muted)",
            borderRadius: "999px",
            padding: "0.15em 0.65em",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {exam.board}
        </span>
      </div>
      <h3 style={{ margin: "0 0 0.15rem", fontSize: "1rem", fontWeight: 700 }}>
        {exam.name}
      </h3>
      <p style={{ margin: "0 0 0.75rem", color: "var(--muted)", fontSize: "0.85rem" }}>
        {exam.session} · starts {exam.start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      {time.started ? (
        <p style={{ color: "var(--ok)", fontWeight: 700, margin: "0 0 0.75rem" }}>
          Exams have started — good luck! 🎉
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <CountdownUnit value={time.days} label="days" />
          <span style={{ color: "var(--muted)", fontWeight: 300, fontSize: "1.4rem", lineHeight: 1, marginBottom: "0.9rem" }}>:</span>
          <CountdownUnit value={time.hours} label="hrs" />
          <span style={{ color: "var(--muted)", fontWeight: 300, fontSize: "1.4rem", lineHeight: 1, marginBottom: "0.9rem" }}>:</span>
          <CountdownUnit value={time.minutes} label="min" />
          <span style={{ color: "var(--muted)", fontWeight: 300, fontSize: "1.4rem", lineHeight: 1, marginBottom: "0.9rem" }}>:</span>
          <CountdownUnit value={time.seconds} label="sec" />
        </div>
      )}
      <button
        onClick={() => onToggle(exam.id)}
        style={{
          background: tracked ? "transparent" : "var(--brand)",
          color: tracked ? "var(--brand)" : "#fff",
          border: "1.5px solid var(--brand)",
          borderRadius: "var(--radius-sm)",
          padding: "0.35em 0.9em",
          fontSize: "0.82rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {tracked ? "Remove from My Exams" : "Add to My Exams"}
      </button>
    </div>
  );
}

export default function CountdownPage() {
  const [myExams, setMyExams] = useState<Set<string>>(new Set());
  const [tipIndex, setTipIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = JSON.parse(localStorage.getItem("myExams") || "[]");
      setMyExams(new Set(saved));
    } catch {}
    setTipIndex(Math.floor(Math.random() * TIPS.length));
  }, []);

  const toggleExam = useCallback((id: string) => {
    setMyExams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("myExams", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const myExamList = EXAMS.filter((e) => myExams.has(e.id));
  const allOtherExams = EXAMS.filter((e) => !myExams.has(e.id));

  if (!mounted) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <Link href="/dashboard/student" style={{ color: "var(--brand)", fontSize: "0.9rem" }}>
            ← Dashboard
          </Link>
        </div>
        <h1 className="page-title">Exam Countdown ⏳</h1>
        <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: "2rem" }}>
          Free study tool — no subscription required. Live countdowns for major exam sessions. Your
          personal exam list is stored only in this browser (no cloud sync).
        </p>

        {myExamList.length > 0 && (
          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
              📌 My Exams
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {myExamList.map((exam) => (
                <ExamCard key={exam.id} exam={exam} myExams={myExams} onToggle={toggleExam} />
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>
            All Upcoming Sessions
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {allOtherExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} myExams={myExams} onToggle={toggleExam} />
            ))}
            {allOtherExams.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                You&apos;re tracking all available sessions!
              </p>
            )}
          </div>
        </section>

        {/* Study tips */}
        <section className="panel" style={{ borderLeft: "4px solid var(--brand)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            💡 Study Tip
          </h2>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>{TIPS[tipIndex]}</p>
          <button
            onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
            style={{
              background: "transparent",
              border: "1px solid var(--brand)",
              color: "var(--brand)",
              borderRadius: "var(--radius-sm)",
              padding: "0.3em 0.8em",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Next tip →
          </button>
        </section>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link
            href="/study/progress"
            style={{
              background: "var(--brand)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              padding: "0.5em 1.2em",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            My Study Log →
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
