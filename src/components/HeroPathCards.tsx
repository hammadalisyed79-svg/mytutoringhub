import Link from "next/link";
import { registerHref } from "@/lib/register-intent";

export function HeroPathCards() {
  return (
    <div className="hero-path-cards" role="group" aria-label="Choose your path">
      <Link href="/search" className="hero-path-card">
        <span className="hero-path-label">For students</span>
        <strong>Find a tutor</strong>
        <span className="hero-path-desc">Search by subject, country, and level.</span>
      </Link>
      <Link href="/become-a-tutor" className="hero-path-card">
        <span className="hero-path-label">For tutors</span>
        <strong>List your profile free</strong>
        <span className="hero-path-desc">Reach students worldwide. Keep 100% of lesson fees.</span>
      </Link>
      <p className="hero-path-footnote">
        New here?{" "}
        <Link href={registerHref("student")}>Join as a student</Link>
        {" · "}
        <Link href={registerHref("tutor")}>List your profile</Link>
      </p>
    </div>
  );
}
