import Link from "next/link";
import type { HubPointsSummary } from "@/lib/hub-points";
import { HubPointsShareActions } from "@/components/HubPointsShareActions";

export function PointsWalletPanel({
  summary,
  role,
}: {
  summary: HubPointsSummary;
  role: "STUDENT" | "TUTOR";
}) {
  const expiryNote =
    summary.expiresAt && summary.balance > 0
      ? `Use by ${summary.expiresAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })} (12-month activity rule)`
      : null;

  return (
    <section className="panel points-wallet" id="hub-points">
      <div className="points-wallet-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            Hub Points
          </p>
          <h2 style={{ margin: "0.25rem 0 0" }}>{summary.balanceLabel}</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.92rem" }}>
            1 point = Rs 1 PKR · redeem up to 50% on plans and tutor ads
          </p>
          {expiryNote ? (
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              {expiryNote}
            </p>
          ) : null}
        </div>
        <Link href="/pricing" className="btn btn-secondary btn-sm">
          Redeem on pricing
        </Link>
      </div>

      <div className="points-wallet-grid">
        <div>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Earn more</h3>
          <ul className="check-list">
            {summary.earnHints.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <HubPointsShareActions referralLink={summary.referralLink} role={role} />
        </div>
        <div>
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Use on</h3>
          <ul className="check-list">
            {summary.redeemHints.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Link href="/free-vs-paid" className="muted" style={{ fontSize: "0.9rem" }}>
            Free vs paid guide →
          </Link>
        </div>
      </div>

      {summary.recent.length > 0 ? (
        <details className="points-ledger">
          <summary>Recent activity</summary>
          <ul>
            {summary.recent.map((row) => (
              <li key={row.id}>
                <span className={row.amount >= 0 ? "compare-yes" : "compare-muted"}>
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount}
                </span>{" "}
                {row.description}
                <span className="muted">
                  {" "}
                  · {row.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
