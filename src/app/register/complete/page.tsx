import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthLayout } from "@/components/AuthLayout";
import { CompleteOnboardingForm } from "@/components/CompleteOnboardingForm";

export const metadata = { title: "Finish account setup" };

export default async function RegisterCompletePage() {
  const session = await auth();
  if (!session?.user) redirect("/register");
  if (session.user.role === "ADMIN" || session.user.onboardingComplete !== false) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <AuthLayout
      title="One last step"
      lead="You signed in with Google or Microsoft. Tell us whether you are joining as a student or a tutor."
    >
      <CompleteOnboardingForm />
    </AuthLayout>
  );
}
