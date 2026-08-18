"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type ProviderId = "google" | "microsoft-entra-id";

type Props = {
  intent: "login" | "register";
  role?: "STUDENT" | "TUTOR";
  disabled?: boolean;
  googleEnabled?: boolean;
  microsoftEnabled?: boolean;
};

export function OAuthButtons({
  intent,
  role,
  disabled,
  googleEnabled,
  microsoftEnabled,
}: Props) {
  const [loading, setLoading] = useState<ProviderId | null>(null);
  const [error, setError] = useState("");

  async function startOAuth(provider: ProviderId) {
    setError("");
    setLoading(provider);
    try {
      const res = await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, ...(role ? { role } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Social sign-in unavailable");
      }
      await signIn(provider, {
        callbackUrl: intent === "register" ? "/pricing?verify=sent" : "/dashboard",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Social sign-in failed");
      setLoading(null);
    }
  }

  if (!googleEnabled && !microsoftEnabled) return null;

  return (
    <div className="oauth-block">
      <div className="oauth-buttons">
        {googleEnabled && (
          <button
            type="button"
            className="btn btn-oauth btn-oauth-google"
            onClick={() => startOAuth("google")}
            disabled={disabled || Boolean(loading)}
          >
            <GoogleMark />
            {loading === "google"
              ? "Connecting to Google…"
              : intent === "login"
                ? "Log in with Google"
                : "Continue with Google"}
          </button>
        )}
        {microsoftEnabled && (
          <button
            type="button"
            className="btn btn-oauth"
            onClick={() => startOAuth("microsoft-entra-id")}
            disabled={disabled || Boolean(loading)}
          >
            <MicrosoftMark />
            {loading === "microsoft-entra-id"
              ? "Connecting to Microsoft…"
              : intent === "login"
                ? "Log in with Microsoft"
                : "Continue with Microsoft"}
          </button>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.203 36 24 36c-5.657 0-10.243-4.343-10.243-10.243S18.343 15.514 24 15.514c2.657 0 5.086.914 6.971 2.457l6.086-6.086C33.514 9.086 28.971 7 24 7 13.514 7 5.486 15.029 5.486 25.514S13.514 44.029 24 44.029c10.486 0 18.514-8.029 18.514-18.514 0-1.086-.086-2.143-.257-3.167z"
      />
      <path
        fill="#FF3D00"
        d="M6.486 14.486l7.029 5.143C15.086 16.086 19.2 13.714 24 13.714c2.657 0 5.086.914 6.971 2.457l6.086-6.086C33.514 9.086 28.971 7 24 7c-6.857 0-12.743 3.657-16.029 9.029z"
      />
      <path
        fill="#4CAF50"
        d="M24 44.029c5.086 0 9.657-1.714 13.257-4.686l-6.114-5.029C29.314 36.343 26.829 37.143 24 37.143c-5.171 0-9.543-3.314-11.086-7.886l-7.2 5.543C9.314 40.457 16.114 44.029 24 44.029z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.314 1.714-.914 3.314-1.714 4.714l.014-.014 6.114 5.029C41.314 39.314 44 33.314 44 25.514 44 23.657 43.829 21.829 43.611 20.083z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#F35325" d="M1 1h10v10H1z" />
      <path fill="#81BC06" d="M12 1h10v10H12z" />
      <path fill="#05A6F0" d="M1 12h10v10H1z" />
      <path fill="#FFBA08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export function AuthDivider() {
  return (
    <div className="auth-divider">
      <span>or</span>
    </div>
  );
}
