/** Allowed hosts for user-uploaded files (Vercel Blob). */
const BLOB_HOST_PATTERNS = [
  /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i,
];

export function isAllowedBlobUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return false;
  try {
    const { hostname, protocol } = new URL(trimmed);
    if (protocol !== "https:") return false;
    return BLOB_HOST_PATTERNS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}
