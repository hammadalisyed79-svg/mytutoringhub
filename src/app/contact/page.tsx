import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact My Tutoring Hub – Support & Billing",
  description:
    "Contact My Tutoring Hub at admin@mytutoringhub.com for account help, Safepay billing, tutor verification, and safety reports. Self-serve Help and AI Support available.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="page">
      <div className="container narrow-prose contact-page">
        <h1 className="page-title">Contact</h1>
        <p className="section-lead">
          We read every message. For the fastest reply, email from the address on your account and
          include a short description of what you need.
        </p>

        <div className="panel">
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Email support</h2>
          <p>
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
          </p>
          <p className="muted">
            Use this address for verification problems, Safepay receipts, refund or cancellation
            requests, safety reports, privacy requests, and account access. Mail from us also comes
            from this address — check junk and promotions.
          </p>
          <h3 className="contact-subhead">Please include</h3>
          <ul className="check-list">
            <li>The email address on your My Tutoring Hub account</li>
            <li>Whether you are a student or a tutor</li>
            <li>What you were trying to do, and what happened instead</li>
            <li>Safepay tracker ID or receipt details for billing questions</li>
            <li>Links or screenshots for reports (tutor profile, message, or request)</li>
          </ul>
        </div>

        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Self-serve first</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Many answers are already documented. These pages are the quickest path for most questions.
          </p>
          <ul className="check-list">
            <li>
              <Link href="/help">Help &amp; FAQ</Link> — accounts, messaging, Teaching Profiles,
              plans, past papers, verification, and safety
            </li>
            <li>
              <Link href="/support">AI Support</Link> — signed-in chat for plans, billing basics, and
              how the platform works
            </li>
            <li>
              <Link href="/pricing">Plans &amp; pricing</Link> — Student Pass, Student Pro, Tutor Pro,
              and add-ons
            </li>
            <li>
              <Link href="/free-vs-paid">Free vs paid</Link> — what is included without upgrading
            </li>
            <li>
              <Link href="/refund">Refund &amp; cancellation policy</Link> — platform purchases billed
              through Safepay
            </li>
            <li>
              <Link href="/settings">Settings</Link> — update your name and password; resend email
              verification from Dashboard when needed
            </li>
            <li>Report a listing from a tutor profile or student request (signed-in users)</li>
          </ul>
        </div>

        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>What we can help with</h2>
          <ul className="check-list">
            <li>Account access, email verification, and suspended accounts</li>
            <li>Student Pass, Student Pro, Tutor Pro, Listing Boost, and Priority Verification Review</li>
            <li>Payment confirmation, receipts, and refund eligibility for platform products</li>
            <li>Identity verification queue questions (the badge is earned, never purchased)</li>
            <li>Safety or conduct reports about tutors, students, or public listings</li>
          </ul>
          <p className="muted" style={{ marginBottom: 0 }}>
            Lesson fees, schedules, and teaching quality are arranged directly between students and
            tutors. We do not process lesson payments and cannot mediate private lesson disputes as a
            payment provider.
          </p>
        </div>

        <p className="muted" style={{ marginTop: "1.25rem" }}>
          Related: <Link href="/terms">Terms</Link>
          {" · "}
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/how-it-works">How it works</Link>
        </p>
      </div>
    </div>
  );
}
