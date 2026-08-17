"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (mode) params.set("mode", mode);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form className="hero-search" onSubmit={onSubmit}>
      <div className="hero-search-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What do you want to learn? e.g. FSc Maths, IELTS, SAT, Spanish…"
          aria-label="Search subject or tutor"
        />
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Lesson mode">
          <option value="">Any format</option>
          <option value="online">Online</option>
          <option value="inperson">In person</option>
        </select>
        <button className="btn" type="submit">
          Search tutors
        </button>
      </div>
      <div className="hero-intent">
        <a href="/register?role=student">I&apos;m looking for a tutor</a>
        <span aria-hidden>·</span>
        <a href="/register?role=tutor">I want to find students</a>
        <span aria-hidden>·</span>
        <a href="/ads">Students looking for tutors</a>
      </div>
    </form>
  );
}
