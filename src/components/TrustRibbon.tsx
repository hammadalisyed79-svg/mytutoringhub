import { isPaidCheckoutLive } from "@/lib/payments-status";

export async function TrustRibbon() {
  const checkoutLive = isPaidCheckoutLive();
  const items = [
    { icon: "✓", label: "Verified tutor profiles" },
    { icon: "◎", label: "Rates in your currency" },
    { icon: "◆", label: "No lesson commission" },
    {
      icon: checkoutLive ? "◈" : "◇",
      label: checkoutLive ? "Secure Safepay checkout" : "Bank transfer accepted",
    },
    { icon: "◉", label: "50+ countries & boards" },
  ] as const;

  return (
    <div className="trust-ribbon" role="region" aria-label="Platform trust signals">
      <div className="container trust-ribbon-inner">
        {items.map((item) => (
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
