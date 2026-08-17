"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

type NavUser = {
  role?: string | null;
} | null;

const PRIMARY = [
  { href: "/search", label: "Find tutors" },
  { href: "/subjects", label: "Subjects" },
  { href: "/ads", label: "Student ads" },
  { href: "/assistant", label: "Study assistant" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/become-a-tutor", label: "Become a tutor" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function SiteNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links = (
    <>
      {PRIMARY.map((item) => (
        <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
          {item.label}
        </Link>
      ))}
      {user ? (
        <>
          <Link href="/messages" onClick={() => setOpen(false)}>
            Messages
          </Link>
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            Dashboard
          </Link>
          <Link href="/settings" onClick={() => setOpen(false)}>
            Settings
          </Link>
          {user.role === "ADMIN" && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          <SignOutButton />
        </>
      ) : (
        <>
          <Link href="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/register" className="btn btn-sm" onClick={() => setOpen(false)}>
            Join free
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <nav className="nav nav-desktop" aria-label="Primary">
        {links}
      </nav>

      <button
        type="button"
        className={`nav-toggle ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`nav-backdrop ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <nav id="mobile-nav" className={`nav-drawer ${open ? "is-open" : ""}`} aria-label="Mobile">
        <div className="nav-drawer-inner">{links}</div>
      </nav>
    </>
  );
}
