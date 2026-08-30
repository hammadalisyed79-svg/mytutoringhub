import Link from "next/link";
import { formatHubPointsMoney } from "@/lib/currency";
import {
  hubPointsEarnCards,
  hubPointsRedeemCards,
  type HubPointsSummary,
} from "@/lib/hub-points";
import { HubPointsShareActions } from "@/components/HubPointsShareActions";

export function PointsWalletPanel({
  summary,
  role,
}: {
  summary: HubPointsSummary;
  role: "STUDENT" | "TUTOR";
}) {
  const earnCards = hubPointsEarnCards(role);
  const redeemCards = hubPointsRedeemCards(role);
  const balanceValue = formatHubPointsMoney(summary.balance, summary.currency);
  const hasBalance = summary.balance > 0;

  const expiryNote =
    summary.expiresAt && hasBalance
      ? `Use by ${summary.expiresAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : null;

  return (
    <section className="points-wallet" id="hub-points">
      <div className="points-wallet-hero">
        <div className="points-wallet-hero-glow" aria-hidden />
        <div className="points-wallet-hero-inner">
          <div className="points-wallet-hero-copy">
            <p className="points-wallet-kicker">
              <span className="points-wallet-kicker-icon" aria-hidden>
                ✦
              </span>
              Hub Points rewards
            </p>
            <div className="points-balance-display">
              <span className="points-balance-number">{summary.balance.toLocaleString()}</span>
              <span className="points-balance-unit">points</span>
            </div>
            <p className="points-balance-equiv">
              Worth <strong>{balanceValue}</strong> in your currency
            </p>
            <p className="points-wallet-meta">
              <strong>{summary.pointValueLabel}</strong>
              <span className="points-wallet-meta-sep">·</span>
              Redeem up to <strong>50% off</strong> plans &amp; tutor add-ons
            </p>
            {expiryNote ? (
              <p className="points-wallet-expiry">
                ⏳ Expires {expiryNote} without activity
              </p>
            ) : null}
          </div>
          <div className="points-wallet-hero-actions">
            <Link href="/pricing" className="btn points-wallet-cta">
              Redeem on pricing
            </Link>
            <Link href="/free-vs-paid" className="btn btn-secondary btn-sm">
              How points work
            </Link>
          </div>
        </div>

        <div className="points-stat-row">
          <div className="points-stat-chip">
            <span className="points-stat-label">Balance</span>
            <strong>{summary.balance.toLocaleString()} pts</strong>
          </div>
          <div className="points-stat-chip">
            <span className="points-stat-label">Local value</span>
            <strong>{balanceValue}</strong>
          </div>
          <div className="points-stat-chip">
            <span className="points-stat-label">Max redeem</span>
            <strong>50% per order</strong>
          </div>
        </div>
      </div>

      {!hasBalance ? (
        <aside className="points-promo-banner">
          <strong>Start earning today</strong>
          <p>
            Share your referral link below — earn <strong>50 points</strong> each time someone
            completes the milestone.
            {role === "TUTOR" ? (
              <>
                {" "}
                Complete your profile for a <strong>200-point</strong> welcome bonus.
              </>
            ) : null}
          </p>
        </aside>
      ) : null}

      <div className="points-wallet-body">
        <div className="points-section">
          <div className="points-section-head">
            <h3>Earn more points</h3>
            <p className="muted">Complete actions — points credit automatically</p>
          </div>
          <div className="points-earn-grid">
            {earnCards.map((card) => (
              <article key={card.id} className="points-action-card points-action-card--earn">
                {card.badge ? <span className="points-card-badge">{card.badge}</span> : null}
                <span className="points-card-emoji" aria-hidden>
                  {card.emoji}
                </span>
                <h4>{card.title}</h4>
                <p className="points-card-reward">
                  <strong>+{card.points} pts</strong>
                  <span className="muted">
                    {" "}
                    ({formatHubPointsMoney(card.points, summary.currency)})
                  </span>
                </p>
                <p className="points-card-desc">{card.description}</p>
              </article>
            ))}
          </div>
          <HubPointsShareActions referralLink={summary.referralLink} role={role} />
        </div>

        <div className="points-section">
          <div className="points-section-head">
            <h3>Redeem on</h3>
            <p className="muted">Apply points at checkout — up to half the price</p>
          </div>
          <div className="points-redeem-grid">
            {redeemCards.map((card) => (
              <Link key={card.title} href={card.href} className="points-action-card points-action-card--redeem">
                {card.badge ? <span className="points-card-badge">{card.badge}</span> : null}
                <h4>{card.title}</h4>
                <p className="points-card-desc">{card.description}</p>
                <span className="points-card-link">View plan →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {summary.recent.length > 0 ? (
        <details className="points-ledger">
          <summary>
            <span>Recent activity</span>
            <span className="points-ledger-count">{summary.recent.length}</span>
          </summary>
          <ul className="points-ledger-list">
            {summary.recent.map((row) => (
              <li key={row.id} className="points-ledger-item">
                <span
                  className={`points-ledger-amount ${row.amount >= 0 ? "is-credit" : "is-debit"}`}
                >
                  {row.amount >= 0 ? "+" : ""}
                  {row.amount} pts
                </span>
                <div className="points-ledger-detail">
                  <strong>{row.description}</strong>
                  <span className="muted">
                    {row.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
