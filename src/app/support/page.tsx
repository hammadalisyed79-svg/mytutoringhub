import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AiChatPanel } from "@/components/AiChatPanel";
import { AI_SUPPORT_PLACEHOLDER, AI_SUPPORT_WELCOME } from "@/lib/ai-support";
import { getSiteSettings } from "@/lib/site-settings";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Support",
  "Get instant answers about plans, messaging, verification, and using My Tutoring Hub.",
);

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/support");

  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && session.user.role !== "ADMIN") {
    return (
      <div className="page">
        <div className="container narrow-prose">
          <h1 className="page-title">Support</h1>
          <p className="muted">AI support is temporarily unavailable.</p>
          <p>
            <Link href="/help">Browse Help &amp; FAQ</Link>
            {" · "}
            <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
          </p>
        </div>
      </div>
    );
  }

  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Support</h1>
        <p className="section-lead">
          Instant answers about Student Pass, Student Pro, Tutor Pro, messaging limits, Teaching
          Profiles, student requests, past papers, verification, Safepay billing, and how the
          platform works. For homework help, use the{" "}
          <Link href="/assistant">Study assistant</Link> (Student Pro for students).
        </p>
        <AiChatPanel
          apiPath="/api/ai/support"
          initiallyConfigured={configured}
          assistantLabel="Support"
          emptyHint={AI_SUPPORT_WELCOME}
          placeholder={AI_SUPPORT_PLACEHOLDER}
          unconfiguredMessage="AI support needs OPENAI_API_KEY. Email admin@mytutoringhub.com meanwhile."
        />
        <p className="muted" style={{ marginTop: "1rem" }}>
          <Link href="/help">Help &amp; FAQ</Link>
          {" · "}
          <Link href="/pricing">Pricing</Link>
          {" · "}
          <Link href="/free-vs-paid">Free vs paid</Link>
          {" · "}
          <Link href="/contact">Contact</Link>
          {" · "}
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a>
        </p>
      </div>
    </div>
  );
}
