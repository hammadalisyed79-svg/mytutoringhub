import { isPaidCheckoutLive } from "@/lib/payments-status";
import {
  NO_LESSON_COMMISSION_SHORT,
  TRUST_COUNTRIES_BOARDS,
  TRUST_IDENTITY_VERIFICATION,
} from "@/lib/business-rules";

export async function TrustRibbon() {
  const checkoutLive = isPaidCheckoutLive();
  const items = [
    { icon: "✓", label: TRUST_IDENTITY_VERIFICATION },
    { icon: "◎", label: "Rates in your currency" },
    { icon: "◆", label: NO_LESSON_COMMISSION_SHORT },
    {
      icon: checkoutLive ? "◈" : "◇",
      label: checkoutLive ? "Secure Safepay checkout" : "Bank transfer accepted",
    },
    { icon: "◉", label: TRUST_COUNTRIES_BOARDS },
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
