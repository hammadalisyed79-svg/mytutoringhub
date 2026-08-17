import Link from "next/link";

export function SubjectHubTabs({ active }: { active: "directory" | "codes" | "papers" }) {
  const items = [
    { id: "directory", href: "/subjects", label: "Subjects" },
    { id: "codes", href: "/subjects?tab=codes", label: "Subject codes" },
    { id: "papers", href: "/past-papers", label: "Past papers" },
  ] as const;

  return (
    <nav className="page-tabs" aria-label="Subjects library">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`page-tab ${active === item.id ? "is-active" : ""}`}
          aria-current={active === item.id ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
