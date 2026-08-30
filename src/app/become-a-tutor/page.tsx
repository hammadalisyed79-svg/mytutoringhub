import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BecomeTutorForm } from "@/components/BecomeTutorForm";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { TUTOR_FREE_LISTING_LINE, NO_LESSON_COMMISSION_LINE } from "@/lib/marketing-copy";
import { tutorRegisterPath } from "@/lib/referral-links";
import { pageMetadata } from "@/lib/seo";
import { getDbUserRole } from "@/lib/dashboard-home";

export const metadata = pageMetadata({
  title: "Become a Tutor – Free Teaching Profiles & Tutor Pro Priority",
  description: `${TUTOR_FREE_LISTING_LINE} Keep 100% of lesson fees. Tutor Pro growth tools complimentary until 30 September 2026.`,
  path: "/become-a-tutor",
});

export const dynamic = "force-dynamic";

export default async function BecomeATutorPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    const role = (await getDbUserRole(session.user.id)) || session.user.role;
    if (role === "ADMIN") redirect("/admin");
    if (role === "TUTOR") redirect("/dashboard/tutor?tab=profile");
  }

  const sp = await searchParams;
  const inviteRef = sp.ref?.trim() || null;
  const isStudent = Boolean(session?.user);
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
            <strong>Same login</strong> — add a tutor profile without creating a second account. Switch
            between student and tutor mode anytime; your tutor profile stays saved.
          </li>
          <li>
            <strong>Free Teaching Profiles</strong> in search when your profile meets the eligibility
            requirements (photo, subjects, bio, rate, and more).
          </li>
          <li>
            <strong>Set your own rate</strong> — online, in person, or both.
          </li>
          <li>
            <strong>No lesson commission</strong> — platform plans are optional upgrades for
            visibility and enquiry tools.
          </li>
        </ul>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>{isStudent ? "Add tutor mode" : "Create your account"}</h3>
            <p className="muted">
              {isStudent
                ? "Keep the same login. We add a tutor profile you can edit anytime — and you can switch back to student tools whenever you need them."
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
              Eligible profiles appear in search with no manual approval queue. Free tutors get up
              to 3 active Teaching Profiles with ordinary search visibility. Tutor Pro unlocks up
              to 10 Teaching Profiles plus relevance-first ranking and unlimited enquiry reveals
              (complimentary until 30 September 2026). Listing Boost is optional. Identity Verified
              is earned after review — Priority Verification Review only jumps the queue.
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
          We do not promise a specific number of students. Visibility depends on your Teaching
          Profiles, location, and how complete your main profile is.{" "}
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
