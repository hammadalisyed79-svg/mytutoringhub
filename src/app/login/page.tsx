import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthLayout } from "@/components/AuthLayout";
import { googleConfigured } from "@/lib/oauth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; verify?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingComplete === false) redirect("/register/complete");
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const sp = await searchParams;
  const googleEnabled = googleConfigured();

  return (
    <AuthLayout
      title="Sign in"
      lead="Access your dashboard, messages, and subscriptions."
      notice={
        <>
          {sp.verified === "1" && (
            <p className="success panel auth-notice">Email verified. You can sign in now.</p>
          )}
          {sp.verify === "sent" && (
            <p className="panel auth-notice">
              Check your inbox for a confirmation email, then sign in below.
            </p>
          )}
          {sp.verify === "expired" && (
            <p className="panel form-error auth-notice">
              That verification link expired. Sign in and resend from your dashboard.
            </p>
          )}
          {sp.verify === "invalid" && (
            <p className="panel form-error auth-notice">
              That verification link is invalid. Sign in and request a new one from your dashboard.
            </p>
          )}
        </>
      }
      footer={
        <p className="auth-switch muted">
          New here? <Link href="/register">Create an account</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms">Terms</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">Privacy</Link>
        </p>
      }
    >
      <LoginForm googleEnabled={googleEnabled} />
    </AuthLayout>
  );
}
