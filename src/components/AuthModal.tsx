"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export function AuthModalFrame({
  title,
  titleId = "auth-modal-title",
  children,
  onClose,
}: {
  title: string;
  titleId?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const router = useRouter();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const dismiss = useCallback(() => {
    if (onCloseRef.current) {
      onCloseRef.current();
      return;
    }
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  useEffect(() => {
    document.body.classList.add("auth-modal-open");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("auth-modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [dismiss]);

  const modal = (
    <div className="auth-modal-page">
      <button type="button" className="auth-modal-scrim" aria-label="Close" onClick={dismiss} />
      <div className="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="auth-modal-close" onClick={dismiss} aria-label="Close">
          <CloseIcon />
        </button>
        <h1 id={titleId} className="auth-modal-title">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );

  // SiteNav mounts this inside the sticky header. backdrop-filter + z-index make
  // that header the containing block for position:fixed, so on mobile the login
  // overlay is clipped to the header strip and the hero stays visible. Portal out.
  if (onClose && typeof document !== "undefined") {
    return createPortal(modal, document.body);
  }

  return modal;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
