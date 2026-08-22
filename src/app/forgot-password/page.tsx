import Link from "next/link";
import { AuthModalFrame } from "@/components/AuthModal";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Forgot Password – My Tutoring Hub",
  description:
    "Reset your My Tutoring Hub password, or sign in with Google or Microsoft instead.",
  path: "/forgot-password",
});

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
