import { Suspense } from "react";
import { AuthModalFrame } from "@/components/AuthModal";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Set New Password – My Tutoring Hub",
  description: "Choose a new password for your My Tutoring Hub account.",
  path: "/reset-password",
});

export default function ResetPasswordPage() {
  return (
    <AuthModalFrame title="Choose a new password" titleId="reset-password-title">
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthModalFrame>
  );
}
