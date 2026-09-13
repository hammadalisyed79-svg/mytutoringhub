"use client";

import dynamic from "next/dynamic";

const AiSupportWidget = dynamic(
  () => import("@/components/AiSupportWidget").then((m) => m.AiSupportWidget),
  { ssr: false },
);

export function AiSupportWidgetLazy({
  configured,
  aiDisabled = false,
}: {
  configured: boolean;
  aiDisabled?: boolean;
}) {
  return <AiSupportWidget configured={configured} aiDisabled={aiDisabled} />;
}
