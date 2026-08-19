export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 80;

export function displayNameErrorMessage() {
  return `Name must be ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters`;
}

export function parseDisplayNameInput(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Enter your name" };
  const name = normalizeDisplayName(raw);
  if (!name) return { ok: false, error: displayNameErrorMessage() };
  return { ok: true, name };
}

/** Collapse whitespace and trim. Returns null if the result is not a valid display name. */
export function normalizeDisplayName(raw?: string | null): string | null {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) return null;
  return name;
}

type OAuthNameProfile = {
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
};

/** Gmail/Google profile display name, then given + family name. */
export function resolveOAuthDisplayName(profile?: unknown): string | null {
  const p = (profile ?? {}) as OAuthNameProfile;
  const combined = [p.given_name || p.givenName, p.family_name || p.familyName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return normalizeDisplayName(p.name) || normalizeDisplayName(combined);
}

export function isPlaceholderDisplayName(name: string | null | undefined, email: string): boolean {
  const n = String(name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!n) return true;
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return Boolean(local) && (n === local || n === email.trim().toLowerCase());
}

function emailLocalFallback(email: string): string {
  const local = email.split("@")[0]?.replace(/\s+/g, " ").trim() || "User";
  if (local.length >= DISPLAY_NAME_MIN) return local.slice(0, DISPLAY_NAME_MAX);
  return "User";
}

/**
 * First Google/Microsoft login: use the provider display name.
 * Later logins: never overwrite a name the user already chose; only replace empty
 * or email-local-part placeholders (so a missed Gmail name can still be filled in).
 */
export function oauthUserDisplayName(opts: {
  existingName?: string | null;
  email: string;
  oauthName?: string | null;
  isNewUser: boolean;
}): string {
  const oauth = normalizeDisplayName(opts.oauthName);
  const fallback = emailLocalFallback(opts.email);
  if (opts.isNewUser) return oauth || fallback;
  const existing = String(opts.existingName ?? "").replace(/\s+/g, " ").trim();
  if (oauth && isPlaceholderDisplayName(existing, opts.email)) return oauth;
  return existing || oauth || fallback;
}
