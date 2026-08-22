import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BecomeTutorForm } from "@/components/BecomeTutorForm";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import { TUTOR_FREE_LISTING_LINE } from "@/lib/marketing-copy";
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
  if (session?.user?.role === "TUTOR") redirect("/dashboard/tutor#invite-tutor");

  const sp = await searchParams;
  const inviteRef = sp.ref?.trim() || null;
  const isStudent = session?.user?.role === "STUDENT";
  const signupHref = tutorRegisterPath(inviteRef);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Are you a tutor? Join My Tutoring Hub</h1>
        <p className="section-lead">{TUTOR_FREE_LISTING_LINE}</p>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>{isStudent ? "Switch this account" : "Create your profile"}</h3>
            <p className="muted">
              {isStudent
                ? "Keep the same login. We turn this account into a tutor listing you can edit anytime."
                : "Add subjects, a headline, rates, qualifications, languages, availability, and a photo."}
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Get listed free</h3>
            <p className="muted">
              A complete profile appears in search. Optional: activate Tutor Basic for priority
              ranking and ads (complimentary until 30 September 2026).
            </p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Get found</h3>
            <p className="muted">
              Students search by country, city, and subject. Optional: verify, highlight, or boost
              from Pricing.
            </p>
          </div>
        </div>

        <div className="hero-ctas">
          {isStudent ? (
            <BecomeTutorForm />
          ) : (
            <Link href={signupHref} className="btn">
              Sign up as a tutor
            </Link>
          )}
        </div>
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/pricing">See tutor plans</Link>
        </p>

        <InviteTutorShare
          referrerId={session?.user?.id}
          referrerName={session?.user?.name}
        />
      </div>
    </div>
  );
}
