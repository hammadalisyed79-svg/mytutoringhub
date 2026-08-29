import {
  NO_LESSON_COMMISSION_SHORT,
  TRUST_COUNTRIES_BOARDS,
  TRUST_IDENTITY_VERIFICATION,
} from "@/lib/business-rules";

const TRUST_ITEMS = [
  { icon: "✓", label: TRUST_IDENTITY_VERIFICATION },
  { icon: "◎", label: "Rates in your currency" },
  { icon: "◆", label: NO_LESSON_COMMISSION_SHORT },
  { icon: "◇", label: "Direct tutor contact" },
  { icon: "◉", label: TRUST_COUNTRIES_BOARDS },
] as const;

export function TrustRibbon() {
  return (
    <div className="trust-ribbon" role="region" aria-label="Platform trust signals">
      <div className="container trust-ribbon-inner">
        {TRUST_ITEMS.map((item) => (
          <span key={item.label} className="trust-ribbon-item">
            <span className="trust-ribbon-icon" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
