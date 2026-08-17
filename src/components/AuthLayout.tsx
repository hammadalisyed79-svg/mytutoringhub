import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AuthLayout({
  title,
  lead,
  children,
  footer,
  notice,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  notice?: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-grid">
        <aside className="auth-aside">
          <Link href="/" className="auth-brand" aria-label="My Tutoring Hub home">
            <Logo />
          </Link>
          <h1 className="auth-aside-title">Private tutors worldwide</h1>
          <p className="auth-aside-copy">
            Connect with verified tutors online or in person. Platform subscriptions unlock messaging;
            lesson fees stay between you and the other party.
          </p>
          <ul className="auth-trust-list">
            <li>Secure checkout via Safepay</li>
            <li>Email confirmation on every sign-in</li>
            <li>Student Pass & Tutor Basic plans</li>
            <li>Works in your local currency</li>
          </ul>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <h2 className="auth-panel-title">{title}</h2>
            <p className="muted">{lead}</p>
          </div>
          {notice}
          {children}
          {footer}
        </section>
      </div>
    </div>
  );
}
