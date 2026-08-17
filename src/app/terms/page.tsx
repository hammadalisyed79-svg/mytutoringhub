export const metadata = {
  title: "Terms of Service",
  description:
    "Terms for using My Tutoring Hub: Student Pass and Tutor Basic subscriptions, off-platform lesson fees, conduct, and reviews.",
};

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
            students and tutors. Platform subscriptions (Student Pass, Tutor Basic, and optional
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
            Students need an active Student Pass to message tutors and post requests. Tutors need
            Tutor Basic to keep a public listing. Optional upgrades (Verified, Highlighted, Ad
            Boost) improve visibility. Subscriptions renew according to the plan you purchase
            unless cancelled. Limited-time offers (for example complimentary Tutor Basic until a
            stated date) end automatically; paid add-ons such as Verified, Highlight, and Ad Boost
            are never included unless purchased. Platform subscriptions are processed by Safepay
            (Stripe is a fallback only). Lesson fees stay off-platform and are never collected by
            My Tutoring Hub.
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
          <h2>7. Contact</h2>
          <p>
            Questions:{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
