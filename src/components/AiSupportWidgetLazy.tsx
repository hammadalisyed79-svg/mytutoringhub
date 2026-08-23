"use client";

import dynamic from "next/dynamic";

const AiSupportWidget = dynamic(
  () => import("@/components/AiSupportWidget").then((m) => m.AiSupportWidget),
  { ssr: false },
);

export function AiSupportWidgetLazy({ configured }: { configured: boolean }) {
  return <AiSupportWidget configured={configured} />;
}
