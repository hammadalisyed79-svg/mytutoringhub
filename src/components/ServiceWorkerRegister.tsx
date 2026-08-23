"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    // Force clients onto the latest SW so integrity fixes are not stuck behind an old controller.
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => undefined);
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // One reload after a new SW takes control — avoids mixed old/new shells.
      if (sessionStorage.getItem("mth-sw-reloaded") === "1") return;
      sessionStorage.setItem("mth-sw-reloaded", "1");
      window.location.reload();
    });
  }, []);

  return null;
}
