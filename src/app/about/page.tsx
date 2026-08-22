import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

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
            tuition centre and we do not take a commission on lesson fees. You arrange schedule and
            payment directly with the other person.
          </p>
          <h2>How the platform is funded</h2>
          <p>
            Students need a Student Pass to message tutors and post “need a tutor” ads. Tutors need
            Tutor Basic to appear in search. Optional add-ons (Verified badge, highlight, ad boost,
            extra ads) improve visibility. Platform subscriptions are billed through Safepay.
          </p>
          <h2>Launch offer</h2>
          <p>
            Tutor Basic listing is complimentary until 30 September 2026. Verified, Highlight, Ad
            Boost, and Unlimited Ads stay paid. After that date the standard Tutor Basic price
            applies.
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
            <Link href="/help">Help</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
