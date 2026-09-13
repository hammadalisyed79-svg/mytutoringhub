import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { BUSINESS, NO_LESSON_COMMISSION_LINE } from "@/lib/business-rules";
import {
  STUDENT_FREE_CONTACTS_LINE,
  TUTOR_FREE_LISTING_LINE,
  TUTOR_PRO_LAUNCH_OFFER_LINE,
} from "@/lib/marketing-copy";

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
          <p>
            My Tutoring Hub connects students and families with independent tutors. We do not run a
            tuition centre and we do not take a commission on lesson fees. {NO_LESSON_COMMISSION_LINE}{" "}
            You arrange schedule and payment directly with the other person.
          </p>
          <h2>How the platform is funded</h2>
          <p>
            Search and registration are free. {STUDENT_FREE_CONTACTS_LINE} Student Pass unlocks
            unlimited messaging and student request ads; Student Pro adds unlimited past papers and the
            AI study assistant. {TUTOR_FREE_LISTING_LINE} Tutor Pro improves growth tools; optional
            Listing Boost helps visibility. Identity verification is a trust review — the badge is
            earned after approval. Platform subscriptions are billed through Safepay.
          </p>
          <h2>Launch offer</h2>
          <p>{TUTOR_PRO_LAUNCH_OFFER_LINE}</p>
          <p>
            <Link href="/pricing?plan=TUTOR_BASIC">View plans</Link>
            {" · "}
            Free tutors keep {BUSINESS.tutorFreeActiveListings} live Teaching Profile whether or not
            they activate Tutor Pro.
          </p>
          <h2>Trust &amp; safety</h2>
          <p>
            Confirmations and receipts come from{" "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>. You can report a
            profile or student ad from the listing. Reviews are moderated before they go public.
          </p>
          <p>
            <Link href="/how-it-works">How it works</Link>
            {" · "}
            <Link href="/pricing">Pricing</Link>
            {" · "}
            <Link href="/help">Help</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
            {" · "}
            <Link href="/terms">Terms</Link>
            {" · "}
            <Link href="/privacy">Privacy</Link>
            {" · "}
            <Link href="/refund">Refunds</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
