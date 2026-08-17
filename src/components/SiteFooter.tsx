import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="logo-link" aria-label="MyTutoringHub home">
            <Logo />
          </Link>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Find private tutors online or at home across Pakistan. Lesson fees stay between student
            and tutor (PKR).
          </p>
        </div>
        <div>
          <h4>Students</h4>
          <div className="footer-col">
            <Link href="/search">Find tutors</Link>
            <Link href="/subjects">Subjects</Link>
            <Link href="/ads">Student requests</Link>
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
            <Link href="/login">Log in</Link>
            <Link href="/register">Join</Link>
            <a href="https://mytutoringhub.com">mytutoringhub.com</a>
          </div>
        </div>
      </div>
      <div className="container footer-note">
        © {new Date().getFullYear()} MyTutoringHub · Private tutors marketplace
      </div>
    </footer>
  );
}
