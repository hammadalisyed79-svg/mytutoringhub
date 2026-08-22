import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudyAssistantChat } from "@/components/StudyAssistantChat";
import { getSiteSettings } from "@/lib/site-settings";
import { canUseStudyAssistant } from "@/lib/subscription";
import type { Role } from "@/lib/types";

export const metadata = { title: "Study assistant" };

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, role: true, suspended: true },
  });
  if (user?.suspended) redirect("/dashboard");
  if (session.user.role !== "ADMIN" && !user?.emailVerified) {
    redirect("/dashboard?verify=1");
  }

  const settings = await getSiteSettings();
  if (settings.disableAiAssistant && session.user.role !== "ADMIN") {
    return (
      <div className="page">
        <div className="container narrow-prose">
          <h1 className="page-title">Study assistant</h1>
          <p className="muted">The study assistant is temporarily unavailable.</p>
        </div>
      </div>
    );
  }

  // Student Pro unlocks AI for students; tutors/admins allowed (see canUseStudyAssistant).
  if (!(await canUseStudyAssistant(session.user.id, session.user.role as Role))) {
    return (
      <div className="page">
        <div className="container narrow-prose">
          <h1 className="page-title">Study assistant</h1>
          <p className="section-lead">
            The AI study assistant is included with Student Pro. Free study tools (progress log and
            exam countdown) stay in this browser only — no cloud sync — and do not require a paid
            plan.
          </p>
          <p>
            <Link className="btn" href="/pricing">
              Get Student Pro
            </Link>
          </p>
          <p className="muted" style={{ marginTop: "1rem" }}>
            <Link href="/study/progress">Study log (free)</Link>
            {" · "}
            <Link href="/study/countdown">Exam countdown (free)</Link>
          </p>
        </div>
      </div>
    );
  }

  const configured = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Study assistant</h1>
        <p className="section-lead">
          Included with Student Pro — explanations, practice questions, and plans. This is an AI
          coach, not a live tutor. For human tutoring, use Find tutors.
        </p>
        <StudyAssistantChat initiallyConfigured={configured} />
      </div>
    </div>
  );
}
