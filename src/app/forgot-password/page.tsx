import { AuthModalFrame } from "@/components/AuthModal";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
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
      <ForgotPasswordForm />
    </AuthModalFrame>
  );
}
