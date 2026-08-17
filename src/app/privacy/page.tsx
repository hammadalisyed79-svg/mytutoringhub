export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="muted">Last updated: August 2026</p>
        <div className="legal-body">
          <h2>1. Data we collect</h2>
          <p>
            Account details (name, email, password hash), role, tutor profile content, student ads,
            messages, reviews, subscription and payment references from Safepay/Stripe, and basic
            technical logs (IP, browser) for security.
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
            You may update profile details in your dashboard/settings and request account deletion.
            Contact{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> for privacy
            requests.
          </p>
          <h2>6. Cookies</h2>
          <p>We use essential cookies for authentication and session security. We also use Vercel Analytics for anonymized page-view counts (no advertising cookies).</p>
        </div>
      </div>
    </div>
  );
}
