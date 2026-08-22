import Link from "next/link";

export type DashboardShortcut = {
  href: string;
  label: string;
  description: string;
  icon: string;
  badge?: string;
};

export function DashboardShortcutCards({
  title = "Shortcuts",
  lead = "Jump to the tools you use most.",
  items,
}: {
  title?: string;
  lead?: string;
  items: DashboardShortcut[];
}) {
  return (
    <section className="panel dashboard-shortcuts-panel">
      <div className="dashboard-shortcuts-head">
        <h2>{title}</h2>
        <p className="muted section-lead-tight">{lead}</p>
      </div>
      <div className="dash-shortcut-grid">
        {items.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} className="dash-shortcut-card">
            <span className="dash-shortcut-icon" aria-hidden>
              {item.icon}
            </span>
            <span className="dash-shortcut-copy">
              <strong>{item.label}</strong>
              <span className="muted">{item.description}</span>
            </span>
            {item.badge ? <span className="dash-shortcut-badge">{item.badge}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
