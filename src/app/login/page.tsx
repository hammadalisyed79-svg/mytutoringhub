import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthModalFrame } from "@/components/AuthModal";
import { microsoftConfigured } from "@/lib/oauth";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Log In – My Tutoring Hub",
  "Log in to My Tutoring Hub with Google, Microsoft, or any email. Access messages, tutor dashboard, and Student Pass features.",
);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; verify?: string; email?: string }>;
}) {
  await connection();
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingComplete === false) redirect("/register/complete");
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const sp = await searchParams;
  const googleEnabled = true;
  const microsoftEnabled = microsoftConfigured();
  const pendingEmail = typeof sp.email === "string" ? sp.email.trim().toLowerCase() : "";

  return (
    <AuthModalFrame title="Log in to your account" titleId="login-title">
      {sp.verified === "1" && (
        <p className="success auth-notice">Email verified. You can log in now.</p>
      )}
      {sp.verify === "sent" && (
        <p className="auth-notice muted">
          Account created. Confirm your email first — then return here to log in.
        </p>
      )}
      {sp.verify === "expired" && (
        <p className="form-error auth-notice">
          That verification link expired. Enter your email below and resend a new confirmation
          link.
        </p>
      )}
      {sp.verify === "invalid" && (
        <p className="form-error auth-notice">
          That verification link is invalid. Enter your email below and request a new one.
        </p>
      )}
      <LoginForm
        googleEnabled={googleEnabled}
        microsoftEnabled={microsoftEnabled}
        initialEmail={pendingEmail}
        showVerifyPrompt={sp.verify === "sent" || sp.verify === "expired" || sp.verify === "invalid"}
      />
    </AuthModalFrame>
  );
}
