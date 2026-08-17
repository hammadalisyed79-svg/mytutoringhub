import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
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
            <Link href="/ads">Student requests</Link>
            <Link href="/assistant">Study assistant</Link>
            <Link href="/pricing">Student Pass</Link>
            <Link href="/how-it-works">How it works</Link>
          </div>
        </div>
        <div>
          <h4>Tutors</h4>
          <div className="footer-col">
            <Link href="/become-a-tutor">Become a tutor</Link>
            <Link href="/register?role=tutor">Sign up as tutor</Link>
            <Link href="/ads">Students looking for tutors</Link>
            <Link href="/pricing">Tutor plans</Link>
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
            <Link href="/login">Log in</Link>
            <Link href="/register">Join</Link>
          </div>
        </div>
      </div>
      <div className="container footer-note">
        © {new Date().getFullYear()} My Tutoring Hub · Private tutors marketplace
      </div>
    </footer>
  );
}
