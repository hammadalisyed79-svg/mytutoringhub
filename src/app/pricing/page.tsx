import { PricingPlans } from "@/components/PricingPlans";

export const metadata = {
  title: "Plans & Pricing – Student Pass and Tutor Subscriptions",
  description:
    "Affordable plans for students and tutors. Student Pass unlocks messaging; Tutor Basic lists your profile. No lesson commission — ever. Prices shown in your local currency.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="page pricing-page">
      <div className="container">
        <PricingPlans />
      </div>
    </div>
  );
}
