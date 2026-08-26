import { Suspense } from "react";
import { AuthModalFrame } from "@/components/AuthModal";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Set new password",
  "Choose a new password for your My Tutoring Hub account.",
);

export default function ResetPasswordPage() {
  return (
    <AuthModalFrame title="Choose a new password" titleId="reset-password-title">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthModalFrame>
  );
}
