export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 80;

export function displayNameErrorMessage() {
  return `Name must be ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters`;
}

export function parseDisplayNameInput(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Enter your name" };
  const name = normalizeDisplayName(raw);
  if (!name) return { ok: false, error: displayNameErrorMessage() };
  if (isSuspiciousDisplayName(name)) {
    return {
      ok: false,
      error: "Use a real name students can trust — avoid symbols, URLs, or spam characters.",
    };
  }
  return { ok: true, name };
}

/** Collapse whitespace and trim. Returns null if the result is not a valid display name. */
export function normalizeDisplayName(raw?: string | null): string | null {
  const name = String(raw ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) return null;
  return name;
}

/**
 * NFKC form used only for detection (lookalikes / fullwidth).
 * Stored display names are not rewritten by this helper.
 */
function detectionForm(name: string): string {
  return name.normalize("NFKC").trim();
}

/**
 * Latin mixed in the same token with scripts commonly used as decorative
 * Latin lookalikes (Canadian Aboriginal, Bopomofo, Han ideographs, etc.).
 * Space-separated bilingual names like "John 王" remain allowed.
 */
function hasObfuscatingScriptMix(token: string): boolean {
  const hasLatin = /\p{Script=Latin}/u.test(token);
  if (!hasLatin) return false;

  // Scripts frequently used to fake Latin glyphs inside one “word”
  if (/\p{Script=Canadian_Aboriginal}/u.test(token)) return true;
  if (/\p{Script=Bopomofo}/u.test(token)) return true;
  if (/\p{Script=Han}/u.test(token)) return true;
  if (/\p{Script=Gothic}/u.test(token)) return true;
  if (/\p{Script=Runic}/u.test(token)) return true;
  if (/\p{Script=Deseret}/u.test(token)) return true;

  // Same-token Latin + Cyrillic / Greek is a common homoglyph spam pattern
  if (/\p{Script=Cyrillic}/u.test(token)) return true;
  if (/\p{Script=Greek}/u.test(token)) return true;

  return false;
}

function hasConfusableLetterForms(n: string): boolean {
  // Fullwidth digits/letters after NFKC usually fold, but catch pre-normalize too
  if (/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/u.test(n)) return true;
  // Mathematical Alphanumeric Symbols (bold/italic/script Latin lookalikes)
  if (/[\u{1D400}-\u{1D7FF}]/u.test(n)) return true;
  // Enclosed alphanumerics
  if (/[\u2460-\u24FF]/u.test(n)) return true;
  return false;
}

/**
 * Detect abusive public display names without rejecting legitimate
 * international / non-Latin scripts (Arabic, CJK, Hangul, Cyrillic, etc.).
 */
export function isSuspiciousDisplayName(name?: string | null): boolean {
  const raw = String(name ?? "").trim();
  if (!raw) return true;

  // Detection may inspect NFKC while preserving the original stored name elsewhere.
  const n = detectionForm(raw);
  if (!n) return true;

  // Control / zero-width / bidi overrides
  if (/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/u.test(n)) return true;

  if (hasConfusableLetterForms(raw) || hasConfusableLetterForms(n)) return true;

  // Token-level Latin + lookalike script mix (e.g. Don*卂乃ᗪㄩ尺…)
  for (const token of n.split(/\s+/).filter(Boolean)) {
    if (hasObfuscatingScriptMix(token)) return true;
  }

  const letters = n.replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, "");
  const letterRatio = letters.replace(/\s/g, "").length / Math.max(1, n.replace(/\s/g, "").length);
  if (letterRatio < 0.45) return true;

  // Repeated punctuation / symbol runs
  if (/(.)\1{4,}/u.test(n.replace(/\s/g, ""))) return true;
  if (/[!@#$%^&*_=+]{3,}/.test(n)) return true;

  // Decorative asterisk wrapping / asterisk-heavy handles
  if (/^\*.+\*$/.test(n) || (n.match(/\*/g) || []).length >= 2) return true;

  // Contact / URL spam
  if (/https?:\/\/|www\.|\.com\b|\.net\b|\.org\b/i.test(n)) return true;
  if (/whatsapp|telegram|@\w{3,}/i.test(n) && !/\p{L}{2,}\s+\p{L}{2,}/u.test(n)) return true;

  // Mostly emoji / symbols with almost no letters
  const letterCount = (n.match(/\p{L}/gu) || []).length;
  if (letterCount < 2) return true;

  return false;
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
