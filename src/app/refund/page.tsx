import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { NO_LESSON_COMMISSION_LINE } from "@/lib/business-rules";

export const metadata = pageMetadata({
  title: "Refund & Cancellation Policy – My Tutoring Hub",
  description:
    "How refunds, cancellations, and digital delivery work for My Tutoring Hub platform subscriptions and past paper purchases.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Refund &amp; cancellation policy</h1>
        <p className="muted">Last updated: August 2026</p>
        <div className="legal-body">
          <h2>1. What this covers</h2>
          <p>
            This policy applies to <strong>platform subscriptions</strong> (Student Pass, Student Pro,
            Tutor Basic, and tutor add-ons) and <strong>individual past paper purchases</strong> billed
            through My Tutoring Hub via Safepay. {NO_LESSON_COMMISSION_LINE} Lesson fees arranged with
            tutors are not processed by us and are not covered here.
          </p>
          <h2>2. Digital delivery</h2>
          <p>
            Subscription features (messaging access, past paper downloads, tutor visibility tools) and
            paid past paper downloads are delivered <strong>immediately</strong> after successful payment.
            You receive an on-screen receipt and a confirmation email from admin@mytutoringhub.com.
          </p>
          <h2>3. Subscriptions &amp; renewal</h2>
          <p>
            Monthly and annual plans renew automatically for the period you purchased unless cancelled
            before the next billing date. Complimentary or promotional plans (for example Tutor Basic
            during a launch window) end on the stated date; paid add-ons are never included unless
            purchased separately.
          </p>
          <h2>4. Cancellation</h2>
          <p>
            To stop future renewals, email{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> from your account
            address with your name and plan. We will confirm when recurring billing has been stopped.
            Access continues until the end of the current paid period unless otherwise agreed.
          </p>
          <h2>5. Refund requests</h2>
          <p>
            Contact{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> within{" "}
            <strong>7 days</strong> of purchase if:
          </p>
          <ul>
            <li>You were charged incorrectly or twice for the same plan</li>
            <li>Platform access did not activate after a successful Safepay payment</li>
            <li>A purchased past paper download is unavailable due to a platform error</li>
          </ul>
          <p>
            Include your receipt or Safepay tracker ID. We review each request manually. Refunds, when
            approved, are returned through the original payment method where Safepay allows.
          </p>
          <h2>6. What we generally do not refund</h2>
          <ul>
            <li>Lesson fees paid directly to a tutor</li>
            <li>Subscriptions where substantial platform use occurred after purchase</li>
            <li>Add-on visibility windows (Highlight, Profile Boost) after the boost period has started</li>
          </ul>
          <h2>7. Related policies</h2>
          <p>
            <Link href="/terms">Terms of Service</Link>
            {" · "}
            <Link href="/privacy">Privacy Policy</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
            {" · "}
            <Link href="/pricing">Plans &amp; pricing</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
