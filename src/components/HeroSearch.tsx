"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseSearchQuery } from "@/lib/search-smart";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseSearchQuery(q);
    const params = new URLSearchParams();
    if (parsed.subject) params.set("subject", parsed.subject);
    if (parsed.location) params.set("location", parsed.location);
    if (parsed.q) params.set("q", parsed.q);
    else if (q.trim() && !parsed.subject && !parsed.location) params.set("q", q.trim());
    const lessonMode = mode || parsed.mode || "";
    if (lessonMode) params.set("mode", lessonMode);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form className="hero-search" onSubmit={onSubmit}>
      <div className="hero-search-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Maths Islamabad, IELTS online, FBISE-HSSC-MATH…"
          aria-label="Search subject, city, or subject code"
          autoComplete="off"
          spellCheck={false}
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
        <a href="/register?role=tutor">I want to teach</a>
        <span aria-hidden>·</span>
        <a href="/ads">Browse student requests</a>
      </div>
    </form>
  );
}
