import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/RegisterForm";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = { title: "Join" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  const settings = await getSiteSettings();

  return (
    <div className="auth-shell">
      <h1 className="page-title">Join MyTutoringHub</h1>
      {settings.disableSignups ? (
        <p className="muted">New signups are temporarily closed. Please check back soon or log in if you already have an account.</p>
      ) : (
        <>
          <p className="muted">Create your account, then verify your email and choose a subscription to connect.</p>
          <RegisterForm />
        </>
      )}
      <p className="muted" style={{ marginTop: "1rem" }}>
        Already registered? <Link href="/login">Log in</Link>
      </p>
      <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        By joining you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
