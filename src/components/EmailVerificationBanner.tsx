import { ResendVerificationButton } from "@/components/ResendVerificationButton";

export type EmailVerificationBannerProps = {
  email: string;
  /** True when the user signed in with Google/Microsoft and has no password yet. */
  oauthOnly: boolean;
  oauthProviders: string[];
};

function providerLabel(providers: string[]) {
  if (providers.includes("google")) return "Google";
  if (providers.includes("microsoft-entra-id")) return "Microsoft";
  return "social sign-in";
}

export function EmailVerificationBanner({
  email,
  oauthOnly,
  oauthProviders,
}: EmailVerificationBannerProps) {
  const via = providerLabel(oauthProviders);

  return (
    <div
      className="panel dashboard-verify-banner"
      role="status"
      aria-live="polite"
    >
      <strong>Confirm your email to unlock the full dashboard</strong>
      {oauthOnly ? (
        <p className="muted">
          You signed in with {via}, but we still need you to confirm{" "}
          <strong>{email}</strong> before messaging, Teaching Profiles, and Hub Points unlock.
          Use the button below — we will send a fresh confirmation link (valid 24 hours).
        </p>
      ) : (
        <p className="muted">
          Please verify <strong>{email}</strong>. Check inbox, junk, and promotions for mail from
          admin@mytutoringhub.com, or request a new link below.
        </p>
      )}
      <ResendVerificationButton email={email} />
    </div>
  );
}
