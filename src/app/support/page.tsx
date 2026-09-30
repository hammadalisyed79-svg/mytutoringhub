import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AiChatPanel } from "@/components/AiChatPanel";
import { AI_SUPPORT_PLACEHOLDER, AI_SUPPORT_WELCOME } from "@/lib/ai-support";
import { getSiteSettings } from "@/lib/site-settings";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Support",
  "Get clear answers about plans, messaging, Teaching Profiles, verification, past papers, and billing on My Tutoring Hub.",
);

function SupportLinks() {
  return (
    <ul className="check-list support-quick-links">
      <li>
        <Link href="/help">Help &amp; FAQ</Link> — full topic guide
      </li>
      <li>
        <Link href="/pricing">Plans &amp; pricing</Link>
      </li>
      <li>
        <Link href="/free-vs-paid">Free vs paid</Link>
      </li>
      <li>
        <Link href="/refund">Refunds &amp; cancellations</Link>
      </li>
      <li>
        <Link href="/contact">Contact</Link>
        {" · "}
        <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
      </li>
      <li>
        Homework or exam coaching:{" "}
        <Link href="/assistant">Study assistant</Link> (Student Pro for students)
      </li>
    </ul>
  );
}

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/support");

  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && session.user.role !== "ADMIN") {
    return (
      <div className="page">
        <div className="container narrow-prose support-page">
          <h1 className="page-title">Support</h1>
          <p className="section-lead">
            AI Support is temporarily unavailable. You can still use Help &amp; FAQ or email our team.
          </p>
          <div className="panel">
            <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Useful links</h2>
            <SupportLinks />
          </div>
        </div>
      </div>
    );
  }

  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <div className="page">
      <div className="container narrow-prose support-page">
        <h1 className="page-title">Support</h1>
        <p className="section-lead">
          Ask about plans, messaging limits, Teaching Profiles, past papers, Identity Verified,
          Listing Boost, and Safepay billing. Answers follow the same guidance as our Help centre.
        </p>

        <div className="panel support-tips-panel">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Tips for a clear answer</h2>
          <ul className="check-list" style={{ marginTop: "0.35rem" }}>
            <li>Say whether you are a student or a tutor</li>
            <li>Name the feature (for example Student Pass, Tutor Pro, or past papers)</li>
            <li>For receipts or refunds, use email support with your Safepay tracker ID</li>
          </ul>
        </div>

        <AiChatPanel
          apiPath="/api/ai/support"
          initiallyConfigured={configured}
          assistantLabel="Support"
          emptyHint={AI_SUPPORT_WELCOME}
          placeholder={AI_SUPPORT_PLACEHOLDER}
          unconfiguredMessage="AI Support is not configured right now. Browse Help & FAQ or email admin@mytutoringhub.com."
        />

        <div className="panel" style={{ marginTop: "1.25rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>More help</h2>
          <SupportLinks />
        </div>
      </div>
    </div>
  );
}
