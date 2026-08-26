import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export async function SiteFooter() {
  await connection();
  const session = await auth();
  const role = session?.user?.role;

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="logo-link" aria-label="My Tutoring Hub home">
            <Logo />
          </Link>
          <p className="footer-blurb footer-prestige">
            A premium tutoring marketplace for students and tutors worldwide. Discover with
            confidence — lesson fees stay between you and your tutor.
          </p>
          <div className="footer-trust-badges" aria-label="Platform highlights">
            <span>Identity verification available</span>
            <span>Local currency</span>
            <span>No commission on lessons</span>
          </div>
        </div>
        <div>
          <h4>Students</h4>
          <div className="footer-col">
            <Link href="/search">Find tutors</Link>
            <Link href="/subjects">Subjects</Link>
            <Link href="/past-papers">Past papers</Link>
            {role !== "TUTOR" && <Link href="/ads">Student requests</Link>}
            <Link href="/pricing">Plans &amp; pricing</Link>
            <Link href="/free-vs-paid">Free vs paid</Link>
            <Link href="/how-it-works">How it works</Link>
          </div>
        </div>
        <div>
          <h4>Study tools</h4>
          <div className="footer-col">
            <Link href="/study/countdown">Exam countdown</Link>
            <Link href="/study/progress">Study progress</Link>
            <Link href="/assistant">Study assistant</Link>
          </div>
        </div>
        <div>
          <h4>Tutors</h4>
          <div className="footer-col">
            {role === "TUTOR" ? (
              <>
                <Link href="/dashboard/tutor">Tutor dashboard</Link>
                <Link href="/ads">Student requests</Link>
                <Link href="/pricing">Tutor plans</Link>
              </>
            ) : (
              <>
                <Link href="/become-a-tutor">Become a tutor</Link>
                <Link href="/pricing">Tutor plans</Link>
              </>
            )}
          </div>
        </div>
        <div>
          <h4>Company</h4>
          <div className="footer-col">
            <Link href="/about">About</Link>
            <Link href="/help">Help &amp; support</Link>
            {session?.user ? <Link href="/support">AI support</Link> : null}
            <Link href="/contact">Contact</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refund">Refunds</Link>
            {!session?.user && (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/register">Join</Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="container footer-note">
        © {new Date().getFullYear()} My Tutoring Hub · Private tutoring, elevated.
      </div>
    </footer>
  );
}
