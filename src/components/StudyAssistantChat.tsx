"use client";

import { AiChatPanel } from "@/components/AiChatPanel";

export function StudyAssistantChat({ initiallyConfigured }: { initiallyConfigured: boolean }) {
  return (
    <AiChatPanel
      apiPath="/api/ai/chat"
      initiallyConfigured={initiallyConfigured}
      assistantLabel="Study assistant"
      emptyHint="Ask about a concept, request practice questions, or build a study plan."
      placeholder="Explain quadratic equations… or quiz me on IELTS writing…"
      unconfiguredMessage="Study assistant is unavailable right now. An admin needs to add OPENAI_API_KEY."
    />
  );
}
