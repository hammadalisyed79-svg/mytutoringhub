import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { NO_LESSON_COMMISSION_LINE } from "@/lib/business-rules";

export const metadata = pageMetadata({
  title: "About My Tutoring Hub – Private Tutors Marketplace",
  description:
    "My Tutoring Hub connects students with independent tutors worldwide. No lesson commission — platform subscriptions fund messaging, search, and study tools.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">About My Tutoring Hub</h1>
        <p className="section-lead">
          A marketplace for private lessons — boards, languages, and exam prep, online or in person.
        </p>
        <div className="legal-body">
          <h2>What we are</h2>
          <p>
            My Tutoring Hub connects students and families with independent tutors worldwide. We do
            not run a tuition centre. {NO_LESSON_COMMISSION_LINE} You arrange schedule and payment
            directly with the other person.
          </p>
          <h2>How the marketplace works</h2>
          <p>
            Search and join are free. Optional Student and Tutor plans unlock messaging capacity,
            Teaching Profile tools, Past Papers, and study features. Platform products are billed
            through Safepay — lesson fees never are.
          </p>
          <h2>Trust</h2>
          <p>
            Identity Verified is earned after admin review. You can report listings. Reviews are
            moderated before they go public. Confirmations come from{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>.
          </p>
          <p className="section-actions" style={{ marginTop: "1.5rem" }}>
            <Link href="/search" className="btn">
              Find a tutor
            </Link>
            <Link href="/become-a-tutor" className="btn btn-secondary" style={{ marginLeft: "0.5rem" }}>
              Become a tutor
            </Link>
          </p>
          <p className="muted" style={{ marginTop: "1rem" }}>
            <Link href="/how-it-works">How it works</Link>
            {" · "}
            <Link href="/pricing">View plans</Link>
            {" · "}
            <Link href="/help">Help</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
