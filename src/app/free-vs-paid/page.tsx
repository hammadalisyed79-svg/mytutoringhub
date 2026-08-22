import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { FreeVsPaidComparison } from "@/components/FreeVsPaidComparison";
import { ValuePropStrip } from "@/components/ValuePropStrip";
import { FREE_VS_PAID_FAQS, FREE_VS_PAID_META } from "@/lib/free-vs-paid";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: FREE_VS_PAID_META.title,
  description: FREE_VS_PAID_META.description,
  path: FREE_VS_PAID_META.path,
});

export default function FreeVsPaidPage() {
  return (
    <div className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...faqPageJsonLd([...FREE_VS_PAID_FAQS]),
        }}
      />
      <div className="container narrow-prose compare-page">
        <p className="eyebrow">Plans explained</p>
        <h1 className="page-title">Free vs paid</h1>
        <ValuePropStrip />
        <FreeVsPaidComparison />
        <p className="muted" style={{ marginTop: "1.5rem" }}>
          Ready to choose a plan? <Link href="/pricing">View pricing</Link> ·{" "}
          <Link href="/help">Help & FAQ</Link> ·{" "}
          <Link href="/how-it-works">How it works</Link>
        </p>
      </div>
    </div>
  );
}
