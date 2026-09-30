import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ALL_HELP_FAQS, HELP_FAQ_CATEGORIES } from "@/lib/help-knowledge";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help & FAQ – Contacting Tutors, Plans & Payments",
  description:
    "Clear answers about finding tutors, Teaching Profiles, Student Pass, Tutor Pro, Safepay billing, email verification, past papers, and safety on My Tutoring Hub.",
  path: "/help",
});

const HELP_PATHS = [
  {
    title: "Students",
    body: "Search tutors, message within your free contacts, upgrade for unlimited chats, and download past papers.",
    links: [
      { href: "#help-finding", label: "Finding tutors" },
      { href: "#help-messaging", label: "Messaging" },
      { href: "#help-papers", label: "Past papers" },
      { href: "/search", label: "Find tutors" },
    ],
  },
  {
    title: "Tutors",
    body: "Go live with one free Teaching Profile, reply to students, and grow with Tutor Pro or Listing Boost.",
    links: [
      { href: "#help-teaching", label: "Listing & profiles" },
      { href: "#help-verification", label: "Identity Verified" },
      { href: "/become-a-tutor", label: "Become a tutor" },
    ],
  },
  {
    title: "Billing & policies",
    body: "Plans, Safepay receipts, refunds, and how to reach a human when you need one.",
    links: [
      { href: "#help-plans", label: "Plans & payments" },
      { href: "#help-policies", label: "Refunds" },
      { href: "/pricing", label: "View plans" },
      { href: "/contact", label: "Contact us" },
    ],
  },
] as const;

export default function HelpPage() {
  return (
    <div className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...faqPageJsonLd(ALL_HELP_FAQS),
        }}
      />
      <div className="container narrow-prose help-page">
        <h1 className="page-title">Help &amp; FAQ</h1>
        <p className="section-lead">
          Everything you need to search tutors, message safely, manage plans, and use past papers —
          written in plain language. Expand a question to read more, or jump to a topic below.
        </p>

        <div className="help-paths" aria-label="Help by audience">
          {HELP_PATHS.map((path) => (
            <section key={path.title} className="panel help-path-card">
              <h2>{path.title}</h2>
              <p className="muted">{path.body}</p>
              <ul className="help-path-links">
                {path.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <nav className="help-toc" aria-label="Help topics">
          {HELP_FAQ_CATEGORIES.map((c) => (
            <a key={c.id} href={`#help-${c.id}`}>
              {c.title}
            </a>
          ))}
        </nav>

        {HELP_FAQ_CATEGORIES.map((cat) => (
          <section key={cat.id} id={`help-${cat.id}`} className="help-category">
            <h2>{cat.title}</h2>
            {cat.blurb ? <p className="muted help-category-blurb">{cat.blurb}</p> : null}
            <div className="faq-list">
              {cat.items.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="panel help-footer-panel" aria-labelledby="help-still-stuck">
          <h2 id="help-still-stuck">Still need help?</h2>
          <p className="muted">
            Start with AI Support for quick answers about plans, messaging, verification, and billing.
            For receipts, safety reports, or account access, email us from the address on your account.
          </p>
          <div className="help-footer-actions">
            <Link href="/support" className="btn">
              Open AI Support
            </Link>
            <Link href="/contact" className="btn btn-secondary">
              Contact options
            </Link>
            <a href="mailto:admin@mytutoringhub.com" className="btn btn-secondary">
              Email support
            </a>
          </div>
          <p className="muted help-footer-links">
            <Link href="/free-vs-paid">Free vs paid</Link>
            {" · "}
            <Link href="/pricing">Plans &amp; pricing</Link>
            {" · "}
            <Link href="/refund">Refunds</Link>
            {" · "}
            <Link href="/terms">Terms</Link>
            {" · "}
            <Link href="/privacy">Privacy</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
