import Link from "next/link";
import { getMarketplaceDemand } from "@/lib/marketplace-demand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketplace demand" };

export default async function AdminDemandPage() {
  const rows = await getMarketplaceDemand(40);
  const recruit = rows.filter((r) => r.signal === "recruit");

  return (
    <>
      <div>
        <h1 className="page-title">Marketplace demand</h1>
        <p className="muted">
          Open student requests versus live teaching listings — recruit where demand outpaces supply.
        </p>
      </div>

      <div className="admin-toolbar panel">
        <p className="admin-toolbar-label">Related</p>
        <div className="admin-quick-links">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/tutor-supply">Tutor supply</Link>
          <Link href="/admin/ads">Listings & requests</Link>
        </div>
      </div>

      {recruit.length > 0 ? (
        <section className="panel" style={{ marginBottom: "1.25rem" }}>
          <h2 style={{ marginTop: 0 }}>Recruit next</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Subjects where open requests are high relative to live listings.
          </p>
          <ul className="demand-recruit-list">
            {recruit.slice(0, 8).map((row) => (
              <li key={row.subject}>
                <strong>{row.subject}</strong>
                <span className="muted">
                  {row.openRequests} open request{row.openRequests === 1 ? "" : "s"} ·{" "}
                  {row.liveListings} live listing{row.liveListings === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="panel muted">No urgent recruitment gaps from current open requests.</p>
      )}

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>All subjects</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Open requests</th>
                <th>Live listings</th>
                <th>Gap</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No subject data yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.subject}>
                    <td>
                      <Link href={`/search?subject=${encodeURIComponent(row.subject)}`}>
                        {row.subject}
                      </Link>
                    </td>
                    <td>{row.openRequests}</td>
                    <td>{row.liveListings}</td>
                    <td>{row.gap > 0 ? `+${row.gap}` : row.gap}</td>
                    <td>
                      <span className={`badge${row.signal === "recruit" ? " accent" : ""}`}>
                        {row.signal}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
