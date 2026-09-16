import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ALL_HELP_FAQS, HELP_FAQ_CATEGORIES } from "@/lib/help-knowledge";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Help & FAQ – Contacting Tutors, Plans & Payments",
  description:
    "Answers about finding tutors, Student Pass, Tutor Pro, Safepay billing, email verification, and safety on My Tutoring Hub.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <div className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...faqPageJsonLd(ALL_HELP_FAQS),
        }}
      />
      <div className="container narrow-prose">
        <h1 className="page-title">Help & FAQ</h1>
        <p className="section-lead">Quick answers by topic. Expand a question to read more.</p>

        <nav className="help-toc" aria-label="Help topics">
          {HELP_FAQ_CATEGORIES.map((c) => (
            <a key={c.id} href={`#help-${c.id}`}>
              {c.title}
            </a>
          ))}
        </nav>

        {HELP_FAQ_CATEGORIES.map((cat) => (
          <section key={cat.id} id={`help-${cat.id}`} style={{ marginTop: "1.75rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>{cat.title}</h2>
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

        <p className="muted" style={{ marginTop: "1.5rem" }}>
          <Link href="/support" className="btn btn-sm">
            Chat with AI support
          </Link>
        </p>
        <p className="muted" style={{ marginTop: "0.85rem" }}>
          Still stuck? <Link href="/contact">Contact</Link> ·{" "}
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> ·{" "}
          <Link href="/free-vs-paid">Free vs paid</Link> · <Link href="/pricing">View plans</Link>
        </p>
      </div>
    </div>
  );
}
