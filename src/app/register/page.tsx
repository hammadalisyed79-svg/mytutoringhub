import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";
import { AuthModalFrame } from "@/components/AuthModal";
import { getSiteSettings } from "@/lib/site-settings";
import { microsoftConfigured } from "@/lib/oauth";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign Up – Join as a Student or Tutor",
  description:
    "Create your free My Tutoring Hub account. Students find private tutors; tutors reach students worldwide. Sign up with Google, Microsoft, or email.",
  path: "/register",
});

export default async function RegisterPage() {
  await connection();
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingComplete === false) redirect("/register/complete");
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const settings = await getSiteSettings();
  const googleEnabled = true;
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
