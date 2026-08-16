import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
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
