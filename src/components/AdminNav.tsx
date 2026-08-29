"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/tutors", label: "Tutors" },
  { href: "/admin/demand", label: "Demand" },
  { href: "/admin/tutor-supply", label: "Tutor supply" },
  { href: "/admin/ads", label: "Ads" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/plans", label: "Plans & prices" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/recommendations", label: "Recommendations" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/nurture", label: "Nurture emails" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/past-papers", label: "Past papers" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "is-active" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
