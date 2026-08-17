import { requireAdminPage } from "@/lib/admin";
import { formatPromoUntil, getLivePlans } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/currency";
import { AdminPlanPricesForm } from "@/components/AdminActions";
import { AdminPastPaperFeeForm } from "@/components/AdminPastPapers";
import { getPastPaperFeePkr } from "@/lib/past-papers";
import Link from "next/link";

export const metadata = { title: "Plans & prices · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireAdminPage();
  const plans = await getLivePlans();
  const paperFee = await getPastPaperFeePkr();

  return (
    <>
      <div>
        <h1 className="page-title">Plans & prices</h1>
        <p className="muted">
          Standard monthly prices power <Link href="/pricing">/pricing</Link> and Safepay checkout.
          Limited-time offers can discount or waive a listing fee until a date you set. Add-ons such
          as Verified, Highlight, and Ad Boost stay independent — they are not included in a
          complimentary Tutor Basic period.
        </p>
      </div>
      <div className="panel">
        <p style={{ marginTop: 0, marginBottom: 0 }}>
          {plans.map((p) => {
            const live = p.isComplimentary
              ? `complimentary until ${formatPromoUntil(p.promoEndsAt)}`
              : p.isPromoActive
                ? `${formatPlanPrice(p.chargePricePkr, "PKR")} until ${formatPromoUntil(p.promoEndsAt)} (was ${formatPlanPrice(p.listPricePkr, "PKR")})`
                : formatPlanPrice(p.listPricePkr, "PKR");
            return `${p.name}: ${live}`;
          }).join(" · ")}
        </p>
      </div>
      <AdminPlanPricesForm plans={plans} />
      <section className="panel">
        <h2>Past paper downloads</h2>
        <p className="muted">
          One-time fee per paper. Upload files on <Link href="/admin/past-papers">Past papers</Link>.
        </p>
        <AdminPastPaperFeeForm feePkr={paperFee} />
      </section>
    </>
  );
}
