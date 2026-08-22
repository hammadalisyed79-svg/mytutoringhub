const TRUST_ITEMS = [
  { icon: "✓", label: "Verified tutor profiles" },
  { icon: "◎", label: "Rates in your currency" },
  { icon: "◆", label: "No lesson commission" },
  { icon: "🔒", label: "Secure Safepay checkout" },
  { icon: "🌍", label: "50+ countries & boards" },
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
