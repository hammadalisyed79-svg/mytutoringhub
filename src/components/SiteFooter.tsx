import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <strong>MyTutoringHub</strong>
          <p>Connect with private tutors. Lesson fees stay between you.</p>
        </div>
        <div className="footer-links">
          <Link href="/search">Browse tutors</Link>
          <Link href="/ads">Student requests</Link>
          <Link href="/pricing">Subscriptions</Link>
          <Link href="/how-it-works">How it works</Link>
        </div>
        <p className="footer-note">© {new Date().getFullYear()} mytutoringhub.com</p>
      </div>
    </footer>
  );
}
