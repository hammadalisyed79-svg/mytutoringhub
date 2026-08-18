import Link from "next/link";
import { AuthModalFrame } from "@/components/AuthModal";

export const metadata = {
  title: "Forgot password",
  description: "Reset your My Tutoring Hub password, or sign in with Google or Microsoft.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthModalFrame title="Forgot password?" titleId="forgot-title">
      <div className="auth-stack">
        <p className="auth-legal" style={{ textAlign: "left", margin: 0 }}>
          If you usually tap <strong>Log in with Google</strong> or Microsoft, go back and use that
          button — there is no password to reset.
        </p>
        <p className="auth-legal" style={{ textAlign: "left", margin: 0 }}>
          For email and password accounts, write to{" "}
          <a href="mailto:admin@mytutoringhub.com">admin@mytutoringhub.com</a> from the address on
          your account and we will help you reset it.
        </p>
        <Link href="/login" className="btn btn-block btn-pill">
          Back to log in
        </Link>
      </div>
    </AuthModalFrame>
  );
}
