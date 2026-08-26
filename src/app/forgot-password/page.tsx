import { AuthModalFrame } from "@/components/AuthModal";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Forgot password",
  "Reset your My Tutoring Hub password, or sign in with Google or Microsoft instead.",
);

export default function ForgotPasswordPage() {
  return (
    <AuthModalFrame title="Forgot password?" titleId="forgot-title">
      <ForgotPasswordForm />
    </AuthModalFrame>
  );
}
