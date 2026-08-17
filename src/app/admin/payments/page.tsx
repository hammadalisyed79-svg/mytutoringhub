import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton, AdminGrantPlanForm } from "@/components/AdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; q?: string }>;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();

  const payments = await prisma.subscription.findMany({
    where: {
      ...(sp.status ? { status: sp.status } : {}),
      ...(q
        ? {
            OR: [
              { plan: { contains: q, mode: "insensitive" } },
              { stripeSubscriptionId: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <>
      <div>
        <h1 className="page-title">Payments & plans</h1>
        <p className="muted">
          Safepay/Stripe checkouts, complimentary grants, and manual recovery. Tracker IDs are stored on
          each row.
        </p>
      </div>

      <form className="filters filters-wide" method="get">
        <label>
          Search
          <input name="q" defaultValue={sp.q || ""} placeholder="Email, plan, tracker id" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={sp.status || ""}>
            <option value="">Any</option>
            <option value="ACTIVE">ACTIVE / paid</option>
            <option value="INCOMPLETE">INCOMPLETE</option>
            <option value="CANCELED">CANCELED</option>
            <option value="TRIALING">TRIALING</option>
            <option value="PAST_DUE">PAST_DUE</option>
          </select>
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {payments.length === 0 && <p className="muted">No payments match.</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Tracker</th>
              <th>Period end</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/admin/users/${s.user.id}`}>
                    <strong>{s.user.name}</strong>
                  </Link>
                  <div className="muted">{s.user.email}</div>
                </td>
                <td>{s.plan}</td>
                <td>{s.status}</td>
                <td className="muted">{s.stripeSubscriptionId || "—"}</td>
                <td>{s.currentPeriodEnd?.toLocaleDateString() || "—"}</td>
                <td>
                  <div className="admin-actions">
                    {s.status !== "ACTIVE" && s.status !== "TRIALING" && (
                      <>
                        <AdminActionButton
                          action="complete_payment"
                          id={s.id}
                          label="Force complete"
                          confirm="Mark this checkout paid and activate the plan without checking Safepay?"
                        />
                        {s.stripeSubscriptionId?.startsWith("track_") && (
                          <AdminActionButton
                            action="recover_payment"
                            id={s.id}
                            label="Recover from Safepay"
                          />
                        )}
                      </>
                    )}
                    {s.status !== "CANCELED" && (
                      <AdminActionButton
                        action="revoke_subscription"
                        id={s.id}
                        label="Revoke"
                        confirm="Cancel this plan?"
                        danger
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="panel">
        <h2>Grant a complimentary plan</h2>
        <p className="muted">Give Student Pass, Tutor Basic, or add-ons without checkout.</p>
        <AdminGrantPlanForm />
      </section>
    </>
  );
}
