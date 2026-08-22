import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy – My Tutoring Hub",
  description:
    "How My Tutoring Hub collects and uses account, profile, message, and payment data. Contact admin@mytutoringhub.com for privacy requests.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="muted">Last updated: August 2026</p>
        <div className="legal-body">
          <h2>1. Data we collect</h2>
          <p>
            Account details (name, email, password hash), role, tutor profile content, student
            requests, messages, reviews, subscription and payment references from Safepay (Stripe
            fields may store Safepay trackers), and basic technical logs (IP, browser) for security.
          </p>
          <h2>2. How we use data</h2>
          <p>
            To operate the marketplace, show profiles in search, enable messaging for subscribers,
            process platform payments, moderate content, and improve the service. We do not sell
            personal data.
          </p>
          <h2>3. Sharing</h2>
          <p>
            Profile information you publish is visible to visitors. Messages are visible to
            conversation participants. Payment processors receive data needed to complete
            checkout. We may disclose information if required by law.
          </p>
          <h2>4. Retention</h2>
          <p>
            We keep account and transaction records while your account is active and for a
            reasonable period afterward for legal and fraud prevention purposes.
          </p>
          <h2>5. Your rights</h2>
          <p>
            You may update profile details in Settings and request account deletion. Contact{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.
          </p>
          <h2>6. Sign-in and email</h2>
          <p>
            You may register with any working mailbox or with optional Google sign-in. We send
            verification, sign-in notices, and receipts from admin@mytutoringhub.com. Google only
            receives the data needed to complete OAuth if you choose that option.
          </p>
          <h2>7. Cookies and analytics</h2>
          <p>
            We use essential cookies for authentication and session security. We also use Vercel
            Analytics for anonymized page-view counts (no advertising cookies).
          </p>
          <h2>8. Contact</h2>
          <p>
            Privacy requests:{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
