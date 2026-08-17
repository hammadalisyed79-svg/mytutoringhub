import { BLOCKED_PAPER_HOSTS } from "./constants";

function hostOf(url: URL) {
  return url.hostname.replace(/^www\./i, "").toLowerCase();
}

function isBlockedHost(host: string) {
  return BLOCKED_PAPER_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

export function allowedImportDomains() {
  return (process.env.PAST_PAPER_ALLOWED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^www\./, ""))
    .filter(Boolean);
}

export function parseHttpsPdfUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Empty URL" };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Only HTTPS URLs are allowed" };
  if (url.username || url.password) return { ok: false, error: "URLs with credentials are not allowed" };
  const host = hostOf(url);
  if (isBlockedHost(host)) {
    return {
      ok: false,
      error: "This domain is a third-party exam-paper library and cannot be imported",
    };
  }
  const allow = allowedImportDomains();
  if (allow.length && !allow.some((d) => host === d || host.endsWith(`.${d}`))) {
    return { ok: false, error: `Domain ${host} is not on PAST_PAPER_ALLOWED_DOMAINS` };
  }
  const path = url.pathname.toLowerCase();
  if (path && !path.endsWith(".pdf") && !path.includes(".pdf")) {
    // Admin may paste a direct PDF URL without .pdf; still allow if HTTPS + allowlisted.
    // HTML indexes are rejected later by magic-byte / MIME checks.
  }
  return { ok: true, url };
}

export function parseUrlList(text: string) {
  return text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
