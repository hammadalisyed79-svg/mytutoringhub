import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact My Tutoring Hub – Support & Billing",
  description:
    "Contact My Tutoring Hub at admin@mytutoringhub.com for account help, Safepay billing, tutor verification, and safety reports.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Contact</h1>
        <p className="section-lead">
          We read every message. For the fastest answer, include the email on your account.
        </p>
        <div className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Email</h2>
          <p>
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
          </p>
          <p className="muted">
            Use this address for verification problems, billing receipts, reports, and privacy
            requests. Mail from us also comes from this address — check junk and promotions.
          </p>
        </div>
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Self-serve</h2>
          <ul className="check-list">
            <li>
              <Link href="/help">Help &amp; FAQ</Link> — plans, email, verification, refunds
            </li>
            <li>
              <Link href="/pricing">Pricing</Link> — Student Pass, Tutor Basic, and add-ons
            </li>
            <li>
              Report a listing from the tutor profile or student ad (signed-in users)
            </li>
            <li>
              <Link href="/settings">Settings</Link> — update your name, password, and email
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
