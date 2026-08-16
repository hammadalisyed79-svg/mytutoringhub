import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="auth-shell">
      <h1 className="page-title">Welcome back</h1>
      <p className="muted">Log in to MyTutoringHub</p>
      <LoginForm />
      <p className="muted" style={{ marginTop: "1rem" }}>
        New here? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
