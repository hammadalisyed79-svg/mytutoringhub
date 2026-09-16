import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminActionButton, AdminGrantPlanForm } from "@/components/AdminActions";
import { AdminNoteModalButton } from "@/components/AdminNoteModal";
import { PaymentsReadinessPanel } from "@/components/PaymentsReadinessPanel";
import { ADMIN_PAGE_SIZE, adminListQuery } from "@/lib/admin-list";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; q?: string; page?: string }>;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(q
      ? {
          OR: [
            { plan: { contains: q, mode: "insensitive" as const } },
            { stripeSubscriptionId: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, payments] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <>
      <div>
        <h1 className="page-title">Payments & plans</h1>
        <p className="muted">
          Recovery & checkouts — force-complete, Safepay recover, and complimentary grants. Tracker IDs
          sit on each row. Plan entitlements:{" "}
          <Link href="/admin/subscriptions">Subscriptions</Link>. Cash analytics:{" "}
          <Link href="/admin/revenue">Revenue</Link>. Catalog amounts:{" "}
          <Link href="/admin/plans">Plans & prices</Link>. Live keys:{" "}
          <Link href="/admin/payments/safepay">Safepay setup</Link> (Vercel env — never paste secrets
          here).
        </p>
      </div>

      <PaymentsReadinessPanel />

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

      <p className="muted">
        {total} payment{total === 1 ? "" : "s"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

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
            {payments.map((s) => {
              const awaiting = ["INCOMPLETE", "PAST_DUE"].includes(s.status);
              return (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/users/${s.user.id}`}>
                      <strong>{s.user.name}</strong>
                    </Link>
                    <div className="muted">{s.user.email}</div>
                  </td>
                  <td>{s.plan}</td>
                  <td>
                    <span
                      className={`admin-badge admin-badge--${s.status.toLowerCase().replace(" ", "_")}`}
                    >
                      {s.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="muted">{s.stripeSubscriptionId || "—"}</td>
                  <td>{s.currentPeriodEnd?.toLocaleDateString() || "—"}</td>
                  <td>
                    <div className="admin-actions">
                      {s.status !== "ACTIVE" && s.status !== "TRIALING" && (
                        <>
                          <AdminNoteModalButton
                            action="complete_payment"
                            id={s.id}
                            label="Force complete"
                            title="Force-complete payment"
                            description={
                              awaiting
                                ? "Mark this checkout paid and activate the plan without checking Safepay."
                                : "This row is not awaiting payment. Confirm with a note to grant access anyway."
                            }
                            noteLabel="Bank transfer reference or reason"
                            noteRequired
                            noteMinLength={awaiting ? 4 : 8}
                            notePlaceholder="e.g. bank ref TX-123 or reason for manual grant"
                            confirmBypassKey={awaiting ? undefined : "confirmBypass"}
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
                        <AdminNoteModalButton
                          action="revoke_subscription"
                          id={s.id}
                          label="Revoke"
                          title="Revoke subscription"
                          description="Cancel this plan for the user. Access ends immediately for entitlement checks."
                          noteLabel="Reason"
                          noteRequired={false}
                          noteMinLength={0}
                          notePlaceholder="Optional reason for the audit log"
                          noteKey="adminNote"
                          danger
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <p className="muted admin-pager">
          Page {page} of {pages}
          {page > 1 && (
            <>
              {" "}
              <Link href={`/admin/payments?${adminListQuery(sp, page - 1)}`}>Previous</Link>
            </>
          )}
          {page < pages && (
            <>
              {" "}
              <Link href={`/admin/payments?${adminListQuery(sp, page + 1)}`}>Next</Link>
            </>
          )}
        </p>
      )}

      <section className="panel">
        <h2>Grant a complimentary plan</h2>
        <p className="muted">Give Student Pass, Tutor Pro, or add-ons without checkout.</p>
        <AdminGrantPlanForm />
      </section>
    </>
  );
}
