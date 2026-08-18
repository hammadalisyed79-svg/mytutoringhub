import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";
import { AuthModalFrame } from "@/components/AuthModal";
import { getSiteSettings } from "@/lib/site-settings";
import { googleConfigured, microsoftConfigured } from "@/lib/oauth";

export const metadata = {
  title: "Sign up",
  description:
    "Join My Tutoring Hub as a student or tutor with Google, Microsoft, or any email.",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingComplete === false) redirect("/register/complete");
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const settings = await getSiteSettings();
  const googleEnabled = googleConfigured();
  const microsoftEnabled = microsoftConfigured();

  return (
    <AuthModalFrame title="Create your account" titleId="register-title">
      {settings.disableSignups ? (
        <p className="auth-legal" style={{ textAlign: "left", margin: 0 }}>
          New signups are temporarily closed. Please check back soon or{" "}
          <Link href="/login">log in</Link> if you already have an account.
        </p>
      ) : (
        <RegisterForm googleEnabled={googleEnabled} microsoftEnabled={microsoftEnabled} />
      )}
    </AuthModalFrame>
  );
}
