import { requireAdminPage } from "@/lib/admin";
import { getLivePlans } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { AdminPlanPricesForm } from "@/components/AdminActions";
import Link from "next/link";

export const metadata = { title: "Plans & prices · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireAdminPage();
  const plans = await getLivePlans();

  return (
    <>
      <div>
        <h1 className="page-title">Plans & prices</h1>
        <p className="muted">
          These amounts power <Link href="/pricing">/pricing</Link> and Safepay checkout. Store the
          monthly price in PKR (site base). Visitors still see their local currency. Lesson fees stay
          off-platform — this is only the Student Pass / Tutor Basic catalog.
        </p>
      </div>
      <div className="panel">
        <p style={{ marginTop: 0 }}>
          Current public prices:{" "}
          {plans.map((p) => `${p.name} ${formatPlanPrice(p.pricePkr, "PKR")}`).join(" · ")}
        </p>
      </div>
      <AdminPlanPricesForm plans={plans} />
    </>
  );
}
