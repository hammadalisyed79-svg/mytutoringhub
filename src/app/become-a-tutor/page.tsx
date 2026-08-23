import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BecomeTutorForm } from "@/components/BecomeTutorForm";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { TUTOR_FREE_LISTING_LINE, NO_LESSON_COMMISSION_LINE } from "@/lib/marketing-copy";
import { tutorRegisterPath } from "@/lib/referral-links";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Become a Tutor – Free Listing & Tutor Basic Priority",
  description: `${TUTOR_FREE_LISTING_LINE} Keep 100% of lesson fees. Tutor Basic complimentary until 30 September 2026.`,
  path: "/become-a-tutor",
});

export const dynamic = "force-dynamic";

export default async function BecomeATutorPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "ADMIN") redirect("/admin");
  if (session?.user?.role === "TUTOR") redirect("/dashboard/tutor?tab=profile");

  const sp = await searchParams;
  const inviteRef = sp.ref?.trim() || null;
  const isStudent = session?.user?.role === "STUDENT";
  const signupHref = tutorRegisterPath(inviteRef);

  return (
    <div className="page">
      <div className="container become-tutor-page">
        <h1 className="page-title">Create your tutor profile</h1>
        <p className="section-lead">
          Reach students online or in person, set your own rate, and keep lesson fees between you and
          your students. {NO_LESSON_COMMISSION_LINE}
        </p>

        <ul className="become-tutor-benefits">
          <li>
            <strong>Free public listing</strong> when your profile meets the eligibility requirements
            (photo, subjects, bio, rate, and more).
          </li>
          <li>
            <strong>Set your own rate</strong> — online, in person, or both.
          </li>
          <li>
            <strong>No lesson commission</strong> — platform plans are optional upgrades for
            visibility and enquiry tools.
          </li>
          <li>
            <strong>Easy to start</strong> — create an account first, then complete your listing on
            the dashboard. High-quality requirements apply only when going public.
          </li>
        </ul>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>{isStudent ? "Switch this account" : "Create your account"}</h3>
            <p className="muted">
              {isStudent
                ? "Keep the same login. We turn this account into a tutor listing you can edit anytime."
                : "Sign up in minutes — you can finish profile details after email verification."}
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Complete your profile</h3>
            <p className="muted">{TUTOR_FREE_LISTING_LINE}</p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Go live automatically</h3>
            <p className="muted">
              Eligible profiles appear in search with no manual approval queue. Optional: Tutor Basic
              for priority ranking and ads (complimentary until 30 September 2026).
            </p>
          </div>
        </div>

        <div className="hero-ctas">
          {isStudent ? (
            <BecomeTutorForm />
          ) : (
            <Link href={signupHref} className="btn">
              Create your tutor profile
            </Link>
          )}
        </div>
        <p className="muted" style={{ marginTop: "1rem" }}>
          We do not promise a specific number of students. Visibility depends on subjects, location,
          and how complete your listing is.{" "}
          <Link href="/pricing">See optional tutor plans</Link>
        </p>

        <InviteTutorShare
          referrerId={session?.user?.id}
          referrerName={session?.user?.name}
        />
      </div>
    </div>
  );
}
