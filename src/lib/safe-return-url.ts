/**
 * Resolve a post-login return path. Only same-origin relative paths are allowed.
 */
export function safeReturnPath(
  raw: string | string[] | null | undefined,
  fallback = "/dashboard",
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  // Block protocol-relative and obvious open-redirect tricks
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;
  return trimmed;
}

export function loginUrlWithNext(nextPath: string) {
  const safe = safeReturnPath(nextPath, "/dashboard");
  return `/login?next=${encodeURIComponent(safe)}`;
}
