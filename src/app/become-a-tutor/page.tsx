import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BecomeTutorForm } from "@/components/BecomeTutorForm";
import { InviteTutorShare } from "@/components/InviteTutorShare";
import {
  TUTOR_FREE_LISTING_LINE,
  NO_LESSON_COMMISSION_LINE,
  TUTOR_PRO_LAUNCH_OFFER_UNTIL,
} from "@/lib/marketing-copy";
import { BUSINESS } from "@/lib/business-rules";
import { tutorRegisterPath } from "@/lib/referral-links";
import { pageMetadata } from "@/lib/seo";
import { getDbUserRole } from "@/lib/dashboard-home";

export const metadata = pageMetadata({
  title: "Become a Tutor – Free Teaching Profiles & Tutor Pro Priority",
  description: `${TUTOR_FREE_LISTING_LINE} Keep 100% of lesson fees. Launch offer: Tutor Pro complimentary until ${TUTOR_PRO_LAUNCH_OFFER_UNTIL}.`,
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
        <h1 className="page-title">Start teaching</h1>
        <p className="section-lead">
          Reach students worldwide. Set your rate. Keep 100% of lesson fees.{" "}
          {NO_LESSON_COMMISSION_LINE}
        </p>

        <ul className="become-tutor-benefits">
          <li>
            <strong>List free</strong> — {BUSINESS.tutorFreeActiveListings} active Teaching Profile
            when your profile is complete.
          </li>
          <li>
            <strong>No lesson commission</strong> — students pay you directly.
          </li>
          <li>
            <strong>Same login</strong> — students can add tutor mode without a second account.
          </li>
        </ul>

        <div className="steps" style={{ marginBottom: "2rem" }}>
          <div className="step">
            <span>1</span>
            <h3>{isStudent ? "Add tutor mode" : "Create your account"}</h3>
            <p className="muted">
              {isStudent
                ? "Keep the same login and switch between student and tutor anytime."
                : "Sign up in minutes — finish details after email verification."}
            </p>
          </div>
          <div className="step">
            <span>2</span>
            <h3>Publish a Teaching Profile</h3>
            <p className="muted">{TUTOR_FREE_LISTING_LINE}</p>
          </div>
          <div className="step">
            <span>3</span>
            <h3>Connect with students</h3>
            <p className="muted">Reply to messages and grow with optional Tutor Pro tools.</p>
          </div>
        </div>

        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Free vs Tutor Pro</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            Free: {BUSINESS.tutorFreeActiveListings} active Teaching Profile. Tutor Pro: up to{" "}
            {BUSINESS.tutorProActiveListings}, plus ranking and unlimited student contacts
            {TUTOR_PRO_LAUNCH_OFFER_UNTIL
              ? ` (complimentary until ${TUTOR_PRO_LAUNCH_OFFER_UNTIL})`
              : ""}
            . Listing Boost is a separate visibility add-on.
          </p>
        </section>

        <div className="hero-ctas">
          {isStudent ? (
            <BecomeTutorForm />
          ) : (
            <Link href={signupHref} className="btn">
              Start teaching
            </Link>
          )}
          <Link href="/pricing?plan=TUTOR_BASIC" className="btn btn-secondary">
            View tutor plans
          </Link>
        </div>

        <p className="muted" style={{ marginTop: "1.25rem" }}>
          Identity Verified is earned after admin review — Priority Verification Review only jumps
          the queue.
        </p>

        <InviteTutorShare referrerId={session?.user?.id} referrerName={session?.user?.name} />
      </div>
    </div>
  );
}
