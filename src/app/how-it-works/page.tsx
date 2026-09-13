import Link from "next/link";
import { auth } from "@/lib/auth";
import { VALUE_PROPOSITION, studentFreeContactsShort } from "@/lib/marketing-copy";
import { BUSINESS } from "@/lib/business-rules";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How It Works – Find, Contact & Learn with a Private Tutor",
  description: `Search private tutors, message with free monthly contacts or Student Pass, then arrange lessons directly. ${VALUE_PROPOSITION}`,
  path: "/how-it-works",
});

export const dynamic = "force-dynamic";

export default async function HowItWorksPage() {
  const session = await auth();
  const role = session?.user?.role;
  const studentCta =
    role === "STUDENT" || role === "TUTOR" || role === "ADMIN"
      ? { href: "/search", label: "Find a tutor" }
      : { href: "/register?role=student", label: "Join free" };
  const tutorCta =
    role === "TUTOR"
      ? { href: "/dashboard/tutor", label: "Open dashboard" }
      : { href: "/become-a-tutor", label: "Start teaching" };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">How it works</h1>
        <p className="section-lead">
          Find a tutor, message them, and arrange lessons directly — no lesson commission.
        </p>

        <section aria-labelledby="hiw-students">
          <h2 id="hiw-students">For students</h2>
          <div className="steps" style={{ marginBottom: "1.5rem" }}>
            <div className="step">
              <span>1</span>
              <h3>Search</h3>
              <p className="muted">Filter by subject, location, and level.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Contact</h3>
              <p className="muted">
                Message tutors ({studentFreeContactsShort()} free, or unlimited with Student Pass).
              </p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Learn</h3>
              <p className="muted">Agree schedule and pay your tutor directly.</p>
            </div>
          </div>
          {role !== "TUTOR" ? (
            <p className="section-actions">
              <Link href={studentCta.href} className="btn">
                {studentCta.label}
              </Link>
            </p>
          ) : null}
        </section>

        <section aria-labelledby="hiw-tutors" style={{ marginTop: "2.5rem" }}>
          <h2 id="hiw-tutors">For tutors</h2>
          <div className="steps" style={{ marginBottom: "1.5rem" }}>
            <div className="step">
              <span>1</span>
              <h3>Create profile</h3>
              <p className="muted">Photo, bio, and how you teach.</p>
            </div>
            <div className="step">
              <span>2</span>
              <h3>Publish Teaching Profiles</h3>
              <p className="muted">
                One active Teaching Profile free; Tutor Pro unlocks up to{" "}
                {BUSINESS.tutorProActiveListings}.
              </p>
            </div>
            <div className="step">
              <span>3</span>
              <h3>Connect with students</h3>
              <p className="muted">Reply to messages and keep 100% of lesson fees.</p>
            </div>
          </div>
          {role !== "STUDENT" ? (
            <p className="section-actions">
              <Link href={tutorCta.href} className="btn">
                {tutorCta.label}
              </Link>
            </p>
          ) : (
            <p className="muted">
              Want to teach as well? <Link href="/become-a-tutor">Add a tutor profile</Link> on this
              account.
            </p>
          )}
        </section>

        <p className="muted" style={{ marginTop: "2rem" }}>
          Plan details live on <Link href="/pricing">Plans &amp; pricing</Link>.
        </p>
      </div>
    </div>
  );
}
