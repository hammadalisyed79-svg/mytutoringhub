"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavLink = { href: string; label: string };
type NavGroup = { id: string; label: string; links: NavLink[] };

const GROUPS: NavGroup[] = [
  {
    id: "people",
    label: "People",
    links: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/tutors", label: "Tutors" },
      { href: "/admin/tutor-supply", label: "Tutor supply" },
    ],
  },
  {
    id: "money",
    label: "Money",
    links: [
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/payments/safepay", label: "Safepay setup" },
      { href: "/admin/plans", label: "Plans & prices" },
      { href: "/admin/subscriptions", label: "Subscriptions" },
      { href: "/admin/revenue", label: "Revenue" },
      { href: "/admin/revenue/funnel", label: "Revenue funnel" },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    links: [
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/verifications", label: "Verifications" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/messages", label: "Messages" },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    links: [
      { href: "/admin/demand", label: "Demand" },
      { href: "/admin/ads", label: "Ads" },
      { href: "/admin/teaching-profiles", label: "Teaching Profiles" },
      { href: "/admin/recommendations", label: "Recommendations" },
    ],
  },
  {
    id: "content",
    label: "Content",
    links: [
      { href: "/admin/subjects", label: "Subjects" },
      { href: "/admin/past-papers", label: "Past papers" },
      { href: "/admin/past-papers/quality", label: "PP quality" },
      { href: "/admin/nurture", label: "Nurture emails" },
    ],
  },
  {
    id: "system",
    label: "System",
    links: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/audit", label: "Audit log" },
    ],
  },
];

function linkActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/revenue") return pathname === "/admin/revenue";
  if (href === "/admin/payments") return pathname === "/admin/payments";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav className="admin-nav" aria-label="Admin">
      <div className="admin-nav-top">
        <Link
          href="/admin"
          className={linkActive(pathname, "/admin") ? "is-active" : undefined}
        >
          Overview
        </Link>
        <button
          type="button"
          className="admin-nav-menu-btn"
          aria-expanded={mobileOpen}
          aria-controls="admin-nav-groups"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Hide menu" : "Menu"}
        </button>
      </div>

      <div
        id="admin-nav-groups"
        className={`admin-nav-groups${mobileOpen ? " is-open" : ""}`}
      >
        {GROUPS.map((group) => (
          <div key={group.id} className="admin-nav-group">
            <p className="admin-nav-group-label">{group.label}</p>
            <div className="admin-nav-group-links">
              {group.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkActive(pathname, item.href) ? "is-active" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
