import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthModalFrame } from "@/components/AuthModal";
import { microsoftConfigured } from "@/lib/oauth";

export const metadata = {
  title: "Log in",
  description: "Log in to My Tutoring Hub with Google, Microsoft, or any email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; verify?: string }>;
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

  return (
    <AuthModalFrame title="Log in to your account" titleId="login-title">
      {sp.verified === "1" && (
        <p className="success auth-notice">Email verified. You can log in now.</p>
      )}
      {sp.verify === "sent" && (
        <p className="auth-notice">Check your inbox for a confirmation email, then log in below.</p>
      )}
      {sp.verify === "expired" && (
        <p className="form-error auth-notice">
          That verification link expired. Log in and resend from your dashboard.
        </p>
      )}
      {sp.verify === "invalid" && (
        <p className="form-error auth-notice">
          That verification link is invalid. Log in and request a new one from your dashboard.
        </p>
      )}
      <LoginForm googleEnabled={googleEnabled} microsoftEnabled={microsoftEnabled} />
    </AuthModalFrame>
  );
}
