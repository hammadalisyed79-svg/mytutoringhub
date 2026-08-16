import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata = { title: "Join" };

export default function RegisterPage() {
  return (
    <div className="auth-shell">
      <h1 className="page-title">Join MyTutoringHub</h1>
      <p className="muted">Create your account, then choose a subscription to connect.</p>
      <RegisterForm />
      <p className="muted" style={{ marginTop: "1rem" }}>
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
