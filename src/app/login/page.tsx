import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; verify?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  const sp = await searchParams;

  return (
    <div className="auth-shell">
      <h1 className="page-title">Welcome back</h1>
      <p className="muted">Log in to MyTutoringHub</p>
      {sp.verified === "1" && (
        <p className="success panel" style={{ marginBottom: "1rem" }}>
          Email verified. You can log in and use messaging, ads, and the study assistant.
        </p>
      )}
      {sp.verify === "expired" && (
        <p className="panel form-error" style={{ marginBottom: "1rem" }}>
          That verification link has expired. Log in and resend a new link from your dashboard.
        </p>
      )}
      {sp.verify === "invalid" && (
        <p className="panel form-error" style={{ marginBottom: "1rem" }}>
          That verification link is invalid. Log in and request a new one from your dashboard.
        </p>
      )}
      <LoginForm />
      <p className="muted" style={{ marginTop: "1rem" }}>
        New here? <Link href="/register">Create an account</Link>
      </p>
      <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> ·{" "}
        <Link href="/help">Help</Link>
      </p>
    </div>
  );
}
