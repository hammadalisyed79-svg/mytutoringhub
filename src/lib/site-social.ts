export type SiteSocialPlatform =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "x"
  | "youtube"
  | "tiktok";

export type SiteSocialLink = {
  platform: SiteSocialPlatform;
  label: string;
  href: string;
};

const SOCIAL_ENV: Array<{ platform: SiteSocialPlatform; label: string; key: string }> = [
  { platform: "linkedin", label: "LinkedIn", key: "NEXT_PUBLIC_SOCIAL_LINKEDIN" },
  { platform: "facebook", label: "Facebook", key: "NEXT_PUBLIC_SOCIAL_FACEBOOK" },
  { platform: "instagram", label: "Instagram", key: "NEXT_PUBLIC_SOCIAL_INSTAGRAM" },
  { platform: "x", label: "X", key: "NEXT_PUBLIC_SOCIAL_X" },
  { platform: "youtube", label: "YouTube", key: "NEXT_PUBLIC_SOCIAL_YOUTUBE" },
  { platform: "tiktok", label: "TikTok", key: "NEXT_PUBLIC_SOCIAL_TIKTOK" },
];

function normalizeSocialUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, "");
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Public footer / marketing social profiles (set on Vercel as NEXT_PUBLIC_SOCIAL_*). */
export function getSiteSocialLinks(): SiteSocialLink[] {
  return SOCIAL_ENV.map(({ platform, label, key }) => ({
    platform,
    label,
    href: normalizeSocialUrl(process.env[key] || ""),
  })).filter((entry) => entry.href.length > 0);
}

/** Extra sameAs URLs for JSON-LD (comma-separated SITE_SOCIAL_URLS). */
export function getExtraSameAsUrls(): string[] {
  const raw =
    process.env.SITE_SOCIAL_URLS ||
    process.env.NEXT_PUBLIC_SITE_SOCIAL_URLS ||
    "";
  return raw
    .split(/[,;\n]+/)
    .map((entry) => normalizeSocialUrl(entry))
    .filter((entry) => /^https:\/\//i.test(entry));
}

export function getOrganizationSameAsUrls(siteUrl: string): string[] {
  const fromProfiles = getSiteSocialLinks().map((link) => link.href);
  return [...new Set([siteUrl, ...fromProfiles, ...getExtraSameAsUrls()])];
}

export function linkedInShareHref(pageUrl: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
}

export function facebookShareHref(pageUrl: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function xShareHref(pageUrl: string, text?: string) {
  const params = new URLSearchParams({ url: pageUrl });
  if (text?.trim()) params.set("text", text.trim());
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
