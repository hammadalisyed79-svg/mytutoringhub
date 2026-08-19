import { headers } from "next/headers";
import { PricingPlans } from "@/components/PricingPlans";
import { getPricingForCountry } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plans & Pricing – Student Pass and Tutor Subscriptions",
  description:
    "Affordable plans for students and tutors. Student Pass unlocks messaging; Tutor Basic lists your profile. No lesson commission — ever. Prices shown in your local currency.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") ?? "GB";
  console.log("[pricing] x-vercel-ip-country header value:", countryCode);
  const pricing = getPricingForCountry(countryCode);

  return (
    <div className="page pricing-page">
      <div className="container">
        <PricingPlans pricing={pricing} detectedCountryCode={countryCode} />
      </div>
    </div>
  );
}
