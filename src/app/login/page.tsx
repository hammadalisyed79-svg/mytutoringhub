import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { AuthModalFrame } from "@/components/AuthModal";
import { microsoftConfigured } from "@/lib/oauth";
import { privateMetadata } from "@/lib/seo";
import { safeReturnPath } from "@/lib/safe-return-url";

export const metadata = privateMetadata(
  "Log In – My Tutoring Hub",
  "Log in to My Tutoring Hub with Google, Microsoft, or any email. Access messages, tutor dashboard, and Student Pass features.",
);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    verified?: string;
    verify?: string;
    email?: string;
    next?: string;
    callbackUrl?: string;
  }>;
}) {
  await connection();
  const sp = await searchParams;
  const returnTo = safeReturnPath(sp.next || sp.callbackUrl, "/dashboard");
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingComplete === false) {
      redirect(`/register/complete?next=${encodeURIComponent(returnTo)}`);
    }
    if (session.user.role === "ADMIN" && returnTo === "/dashboard") redirect("/admin");
    redirect(returnTo);
  }
  const googleEnabled = true;
  const microsoftEnabled = microsoftConfigured();
  const pendingEmail = typeof sp.email === "string" ? sp.email.trim().toLowerCase() : "";

  return (
    <AuthModalFrame title="Log in to your account" titleId="login-title">
      {sp.verified === "1" && (
        <p className="success auth-notice">
          Email confirmed. You can log in now — a short welcome message is on its way.
        </p>
      )}
      {sp.verify === "sent" && (
        <p className="auth-notice muted">
          Account created. Check your inbox for <strong>Confirm your email</strong>, open the
          link, then click Confirm. After that you can log in here.
        </p>
      )}
      {sp.verify === "expired" && (
        <p className="form-error auth-notice">
          That confirmation link has expired. Enter your email below to send a new one. If you
          already confirmed, just log in.
        </p>
      )}
      {sp.verify === "invalid" && (
        <p className="form-error auth-notice">
          That confirmation link is invalid. Enter your email below to request a new one, or log
          in if you already verified.
        </p>
      )}
      <LoginForm
        googleEnabled={googleEnabled}
        microsoftEnabled={microsoftEnabled}
        initialEmail={pendingEmail}
        showVerifyPrompt={sp.verify === "sent" || sp.verify === "expired" || sp.verify === "invalid"}
        nextPath={returnTo}
      />
    </AuthModalFrame>
  );
}
