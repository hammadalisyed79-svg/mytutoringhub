"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

type NavUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  unreadCount?: number;
} | null;

function accountLabel(user: NonNullable<NavUser>) {
  const name = user.name?.trim();
  if (name) return name;
  const local = user.email?.trim().split("@")[0];
  return local || "Account";
}

function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

function NavIdentity({
  name,
  compact = false,
  className = "",
}: {
  name: string;
  compact?: boolean;
  className?: string;
}) {
  const shown = compact ? firstName(name) : name;
  return (
    <span
      className={`nav-identity ${compact ? "is-compact" : ""} ${className}`.trim()}
      title={`Signed in as ${name}`}
      aria-label={`Signed in as ${name}`}
    >
      <span className="nav-online-dot" aria-hidden="true" />
      <span className="nav-identity-name">{shown}</span>
    </span>
  );
}

const PRIMARY = [
  { href: "/search", label: "Find tutors" },
  { href: "/subjects", label: "Subjects" },
  { href: "/past-papers", label: "Past papers" },
  { href: "/ads", label: "Student ads" },
  { href: "/pricing", label: "Pricing" },
] as const;

const MORE = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/become-a-tutor", label: "Become a tutor" },
  { href: "/assistant", label: "Study assistant" },
] as const;

function AccountLinks({
  user,
  onNavigate,
}: {
  user: NavUser;
  onNavigate: () => void;
}) {
  if (!user) {
    return (
      <>
        <Link href="/login" onClick={onNavigate}>
          Log in
        </Link>
        <Link href="/register" className="btn btn-sm" onClick={onNavigate}>
          Join free
        </Link>
      </>
    );
  }

  return (
    <>
      {user.role === "ADMIN" && (
        <Link href="/admin" onClick={onNavigate}>
          Admin
        </Link>
      )}
      <Link href="/messages" onClick={onNavigate}>
        Messages
        {user.unreadCount ? (
          <span className="nav-badge" aria-label={`${user.unreadCount} unread messages`}>
            {user.unreadCount > 99 ? "99+" : user.unreadCount}
          </span>
        ) : null}
      </Link>
      {user.role !== "ADMIN" && (
        <Link href="/dashboard" onClick={onNavigate}>
          Dashboard
        </Link>
      )}
      <Link href="/settings" onClick={onNavigate}>
        Settings
      </Link>
      <SignOutButton />
    </>
  );
}

export function SiteNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreMenuId = useId();

  function closeAll() {
    setOpen(false);
    setMoreOpen(false);
  }

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreOpen]);

  return (
    <>
      <nav className="nav nav-desktop" aria-label="Primary">
        <div className="nav-primary">
          {PRIMARY.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeAll}>
              {item.label}
            </Link>
          ))}
          <div className={`nav-more ${moreOpen ? "is-open" : ""}`} ref={moreRef}>
            <button
              type="button"
              className="nav-more-toggle"
              aria-expanded={moreOpen}
              aria-controls={moreMenuId}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <span className="nav-more-caret" aria-hidden="true" />
            </button>
            <div id={moreMenuId} className="nav-more-menu" role="menu" hidden={!moreOpen}>
              {MORE.map((item) => (
                <Link key={item.href} href={item.href} role="menuitem" onClick={closeAll}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <div className="header-actions">
        {user ? <NavIdentity name={accountLabel(user)} compact /> : null}
        <AccountLinks user={user} onNavigate={closeAll} />
      </div>

      {user ? (
        <NavIdentity name={accountLabel(user)} compact className="header-identity" />
      ) : null}

      <button
        type="button"
        className={`nav-toggle ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          setMoreOpen(false);
          setOpen((v) => !v);
        }}
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
        <div className="nav-drawer-inner">
          {PRIMARY.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeAll}>
              {item.label}
            </Link>
          ))}
          {MORE.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeAll}>
              {item.label}
            </Link>
          ))}
          <div className="nav-drawer-account">
            {user ? (
              <NavIdentity name={accountLabel(user)} className="nav-drawer-identity" />
            ) : null}
            <AccountLinks user={user} onNavigate={closeAll} />
          </div>
        </div>
      </nav>
    </>
  );
}
