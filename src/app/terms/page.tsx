import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service – My Tutoring Hub",
  description:
    "Terms for using My Tutoring Hub: Student Pass and Tutor subscriptions, off-platform lesson fees, conduct, reviews, and billing.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Terms of Service</h1>
        <p className="muted">Last updated: August 2026</p>
        <div className="legal-body">
          <h2>1. About My Tutoring Hub</h2>
          <p>
            My Tutoring Hub is a marketplace that connects students and private tutors. We do not
            provide lessons ourselves. Lesson fees and scheduling are arranged directly between
            students and tutors. Platform subscriptions (Student Pass, Tutor Pro, and optional
            upgrades) are billed separately through our payment partners.
          </p>
          <h2>2. Accounts</h2>
          <p>
            You must provide accurate registration details and keep your password secure. You may
            sign in with email and password or optional Google sign-in. You are responsible for
            activity under your account. We may suspend accounts that violate these terms or harm
            other users.
          </p>
          <h2>3. Subscriptions</h2>
          <p>
            Free student accounts may browse tutors and start a limited number of new tutor contacts
            each month as shown on Plans &amp; pricing. Student Pass unlocks unlimited tutor
            contacts and student request ads; Student Pro adds unlimited past-paper downloads and
            the AI study assistant where offered. Tutors with a complete profile may appear in
            search without a paid plan. Tutor Pro and optional upgrades (Priority Verification
            Review, Listing Boost per teaching listing, legacy listing packs) improve ranking and
            visibility tools. Subscriptions renew
            according to the plan you purchase unless cancelled. Limited-time offers (for example
            complimentary Tutor Pro until a stated date) end
            automatically; free tutors keep up to 3 active teaching listings with ordinary search
            visibility, and Tutor Pro unlocks up to 10. Paid add-ons such as
            Listing Boost are never included unless purchased. The Identity Verified badge is
            granted only after successful identity review. Platform
            subscriptions are processed by Safepay when card checkout is live; until then paid
            plans are activated manually after payment confirmation. Lesson fees stay
            off-platform and are never collected by My Tutoring Hub.
          </p>
          <h2>4. Conduct</h2>
          <p>
            Do not post false information, spam, harassment, or illegal content. Do not scrape the
            site or circumvent messaging/subscription rules. Report suspicious profiles via Help.
          </p>
          <h2>5. Reviews</h2>
          <p>
            Reviews must reflect genuine lesson experiences. We may moderate or remove reviews that
            appear fake or abusive.
          </p>
          <h2>6. Liability</h2>
          <p>
            Lessons and payments between users are outside our control. My Tutoring Hub is provided
            “as is” without warranties of uninterrupted service. Our liability is limited to fees
            you paid us for platform subscriptions in the prior 30 days.
          </p>
          <h2>7. Governing law</h2>
          <p>
            These terms are governed by the laws of Pakistan. Disputes should first be raised with{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>. Where required by
            local consumer law, mandatory protections in your country of residence still apply.
          </p>
          <h2>8. Contact</h2>
          <p>
            Questions:{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
          </p>
          <p>
            See also our{" "}
            <a href="/privacy">Privacy Policy</a>,{" "}
            <a href="/refund">Refund &amp; cancellation policy</a>, and{" "}
            <a href="/pricing">Plans &amp; pricing</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
