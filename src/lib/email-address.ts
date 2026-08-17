/** Accept Gmail, Hotmail/Outlook, Yahoo, iCloud, and any other normal mailbox. */
export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function isValidEmail(email: string) {
  if (!email || email.length > 254) return false;
  if (email.includes("..") || email.startsWith(".") || email.endsWith(".")) return false;
  const at = email.lastIndexOf("@");
  if (at < 1) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain || local.length > 64) return false;
  if (!domain.includes(".") || domain.startsWith("-") || domain.endsWith("-")) return false;
  return /^[a-z0-9._%+\-]+$/i.test(local) && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}
