import OpenAI from "openai";

export const PRIMARY_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
export const FALLBACK_MODELS = ["gpt-4o-mini", "gpt-3.5-turbo"].filter(
  (m, i, arr) => m !== PRIMARY_MODEL && arr.indexOf(m) === i,
);

export type SafeOpenAiError = {
  error: string;
  code?: string;
  status: number;
};

export function mapOpenAiError(err: unknown): SafeOpenAiError {
  if (err instanceof OpenAI.APIError) {
    const code = typeof err.code === "string" ? err.code : undefined;
    const raw =
      (typeof err.error === "object" &&
        err.error &&
        "message" in err.error &&
        typeof (err.error as { message?: unknown }).message === "string" &&
        (err.error as { message: string }).message) ||
      err.message ||
      "Assistant request failed";

    if (
      code === "insufficient_quota" ||
      /insufficient.?quota|exceeded your current quota|billing hard limit/i.test(raw)
    ) {
      return {
        error:
          "AI support is temporarily unavailable. Please email admin@mytutoringhub.com and we will help you shortly.",
        code: code || "insufficient_quota",
        status: 502,
      };
    }
    if (code === "invalid_api_key" || err.status === 401) {
      return {
        error: "AI support is not configured right now. Please email admin@mytutoringhub.com.",
        code: code || "invalid_api_key",
        status: 502,
      };
    }
    if (code === "model_not_found" || /model.*not.*found|does not exist/i.test(raw)) {
      return {
        error: "AI model is unavailable. Please try again later or email admin@mytutoringhub.com.",
        code: code || "model_not_found",
        status: 502,
      };
    }
    if (err.status === 429) {
      return {
        error: "Too many requests. Please wait a minute and try again.",
        code: code || "rate_limit_exceeded",
        status: 502,
      };
    }

    const cleaned = raw.replace(/^\d{3}\s+/, "").trim();
    return {
      error: cleaned || "Assistant request failed",
      code,
      status: 502,
    };
  }

  if (err instanceof Error && err.message) {
    return { error: "Assistant request failed. Please try again shortly.", status: 502 };
  }

  return { error: "Assistant request failed", status: 502 };
}

export async function createOpenAiCompletion(
  openai: OpenAI,
  system: string,
  chronological: { role: string; content: string }[],
  model: string,
) {
  return openai.chat.completions.create({
    model,
    temperature: 0.5,
    messages: [
      { role: "system", content: system },
      ...chronological.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });
}

export async function completeWithFallback(
  openai: OpenAI,
  system: string,
  chronological: { role: string; content: string }[],
) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastErr: unknown;
  for (const model of modelsToTry) {
    try {
      return await createOpenAiCompletion(openai, system, chronological, model);
    } catch (err) {
      lastErr = err;
      const mapped = mapOpenAiError(err);
      const canFallback =
        mapped.code === "model_not_found" || /model.*not.*found|does not exist/i.test(mapped.error);
      if (!canFallback) throw err;
    }
  }
  throw lastErr;
}
