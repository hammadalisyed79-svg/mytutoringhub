import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";
import { AuthLayout } from "@/components/AuthLayout";
import { getSiteSettings } from "@/lib/site-settings";
import { googleConfigured } from "@/lib/oauth";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingComplete === false) redirect("/register/complete");
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const settings = await getSiteSettings();
  const googleEnabled = googleConfigured();

  return (
    <AuthLayout
      title="Create your account"
      lead="Join as a student or tutor. Verify your email, then choose a plan to connect."
      footer={
        <p className="auth-switch muted">
          Already registered? <Link href="/login">Sign in</Link>
          <span aria-hidden="true"> · </span>
          By joining you agree to our <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      }
    >
      {settings.disableSignups ? (
        <p className="panel muted">
          New signups are temporarily closed. Please check back soon or{" "}
          <Link href="/login">sign in</Link> if you already have an account.
        </p>
      ) : (
        <RegisterForm googleEnabled={googleEnabled} />
      )}
    </AuthLayout>
  );
}
