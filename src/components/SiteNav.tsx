"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { AuthModalFrame } from "@/components/AuthModal";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";

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

const PUBLIC_LINKS = [
  { href: "/search", label: "Find tutors" },
  { href: "/subjects", label: "Subjects" },
  { href: "/ads", label: "Student ads" },
  { href: "/become-a-tutor", label: "Become a tutor" },
  { href: "/pricing", label: "Pricing" },
  { href: "/past-papers", label: "Past papers" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/assistant", label: "Study assistant" },
] as const;

function shouldOpenAuthDialog(e: React.MouseEvent) {
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
}

function AccountLinks({
  user,
  pathname,
  onNavigate,
  onOpenLogin,
  onOpenRegister,
}: {
  user: NavUser;
  pathname: string;
  onNavigate: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}) {
  if (!user) {
    return (
      <>
        <Link
          href="/login"
          onClick={(e) => {
            if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
              onNavigate();
              return;
            }
            if (!shouldOpenAuthDialog(e)) return;
            e.preventDefault();
            onNavigate();
            onOpenLogin();
          }}
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="btn btn-sm"
          onClick={(e) => {
            if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
              onNavigate();
              return;
            }
            if (!shouldOpenAuthDialog(e)) return;
            e.preventDefault();
            onNavigate();
            onOpenRegister();
          }}
        >
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

export function SiteNav({
  user,
  googleEnabled = false,
  microsoftEnabled = false,
}: {
  user: NavUser;
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<null | "login" | "register">(null);

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setAuthMode(null);
  }, [pathname]);

  return (
    <>
      <nav className="nav nav-desktop" aria-label="Primary">
        <div className="nav-primary">
          {PUBLIC_LINKS.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="header-actions">
        {user ? <NavIdentity name={accountLabel(user)} compact /> : null}
        <AccountLinks
          user={user}
          pathname={pathname}
          onNavigate={closeMenu}
          onOpenLogin={() => setAuthMode("login")}
          onOpenRegister={() => setAuthMode("register")}
        />
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
        <div className="nav-drawer-inner">
          {PUBLIC_LINKS.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
          <div className="nav-drawer-account">
            {user ? (
              <NavIdentity name={accountLabel(user)} className="nav-drawer-identity" />
            ) : null}
            <AccountLinks
              user={user}
              pathname={pathname}
              onNavigate={closeMenu}
              onOpenLogin={() => setAuthMode("login")}
              onOpenRegister={() => setAuthMode("register")}
            />
          </div>
        </div>
      </nav>

      {authMode && !user && (
        <AuthModalFrame
          title={authMode === "login" ? "Log in to your account" : "Create your account"}
          titleId={authMode === "login" ? "nav-login-title" : "nav-register-title"}
          onClose={() => setAuthMode(null)}
        >
          {authMode === "login" ? (
            <LoginForm
              googleEnabled={googleEnabled}
              microsoftEnabled={microsoftEnabled}
              onSwitchToRegister={() => setAuthMode("register")}
            />
          ) : (
            <RegisterForm
              googleEnabled={googleEnabled}
              microsoftEnabled={microsoftEnabled}
              onSwitchToLogin={() => setAuthMode("login")}
            />
          )}
        </AuthModalFrame>
      )}
    </>
  );
}
