"use client";

import { useState } from "react";
import type { SubscriptionPlan } from "@/lib/types";

export function SubscribeButton({
  plan,
  label = "Subscribe",
}: {
  plan: SubscriptionPlan;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not start checkout");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <div>
      <button className="btn" type="button" onClick={subscribe} disabled={loading}>
        {loading ? "Please wait…" : label}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
