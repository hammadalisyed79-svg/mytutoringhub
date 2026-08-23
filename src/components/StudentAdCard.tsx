import Link from "next/link";
import { formatHourly } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";

export type StudentAdCardData = {
  id: string;
  title: string;
  subject: string;
  level: string;
  location: string;
  status: string;
  budget: number | null;
  online: boolean;
  inPerson: boolean;
  createdAt: Date;
};

function statusMeta(status: string) {
  const key = status.toUpperCase();
  if (key === "OPEN") return { label: "Open", className: "ad-status-open" };
  if (key === "CLOSED") return { label: "Closed", className: "ad-status-closed" };
  return { label: status, className: "ad-status-default" };
}

export function StudentAdCard({
  ad,
  currency,
  href,
}: {
  ad: StudentAdCardData;
  currency: CurrencyCode;
  href?: string;
}) {
  const status = statusMeta(ad.status);
  const modes = [
    ad.online ? "Online" : null,
    ad.inPerson ? "In person" : null,
  ].filter(Boolean);

  const inner = (
    <>
      <div className="student-ad-card-head">
        <span className={`student-ad-status ${status.className}`}>{status.label}</span>
        <time className="muted" dateTime={ad.createdAt.toISOString()}>
          {ad.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </time>
      </div>
      <h3 className="student-ad-card-title">{ad.title}</h3>
      <div className="student-ad-card-meta">
        <span>
          <strong>Subject:</strong> {ad.subject}
        </span>
        <span>
          <strong>Level:</strong> {ad.level || "Any"}
        </span>
        <span>
          <strong>Location:</strong> {ad.location || "Online"}
        </span>
      </div>
      <div className="student-ad-card-footer">
        {modes.length > 0 ? (
          <span className="student-ad-modes">{modes.join(" · ")}</span>
        ) : null}
        {ad.budget != null && ad.budget > 0 ? (
          <span className="student-ad-budget">
            Budget <strong>{formatHourly(ad.budget, currency)}</strong>
          </span>
        ) : (
          <span className="muted">Budget flexible</span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="student-ad-card">
        {inner}
      </Link>
    );
  }

  return <article className="student-ad-card">{inner}</article>;
}
