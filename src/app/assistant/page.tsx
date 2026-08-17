import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudyAssistantChat } from "@/components/StudyAssistantChat";

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

  const configured = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="page">
      <div className="container narrow-prose">
        <h1 className="page-title">Study assistant</h1>
        <p className="section-lead">
          Get study help anytime — explanations, practice questions, and plans. This is an AI coach,
          not a live tutor. For human tutoring, use Find tutors.
        </p>
        <StudyAssistantChat initiallyConfigured={configured} />
      </div>
    </div>
  );
}
