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
          <p className="muted footer-blurb">
            Private tutors worldwide. Lesson fees stay between you — prices shown in your local
            currency.
          </p>
        </div>
        <div>
          <h4>Students</h4>
          <div className="footer-col">
            <Link href="/search">Find tutors</Link>
            <Link href="/subjects">Subjects</Link>
            <Link href="/past-papers">Past papers</Link>
            {role !== "TUTOR" && <Link href="/ads">Student requests</Link>}
            <Link href="/pricing">{role === "STUDENT" ? "Student Pass" : "Pricing"}</Link>
            <Link href="/how-it-works">How it works</Link>
          </div>
        </div>
        <div>
          <h4>Tutors</h4>
          <div className="footer-col">
            {role === "TUTOR" ? (
              <>
                <Link href="/dashboard">Tutor dashboard</Link>
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
            <Link href="/help">Help & FAQ</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
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
        © {new Date().getFullYear()} My Tutoring Hub · Private tutors marketplace
      </div>
    </footer>
  );
}
