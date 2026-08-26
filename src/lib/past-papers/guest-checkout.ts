import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

export const GUEST_PAPER_TOKEN_TTL_MS = 90 * 86400000;

export function createGuestDownloadToken() {
  return randomBytes(32).toString("hex");
}

export function guestDownloadUrl(catalogKey: string, token: string) {
  const params = new URLSearchParams({ key: catalogKey, token });
  return `/api/past-papers/download?${params.toString()}`;
}

export function guestDownloadAbsoluteUrl(catalogKey: string, token: string) {
  return absoluteUrl(guestDownloadUrl(catalogKey, token));
}

export function normalizeGuestEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidGuestEmail(raw: string) {
  const email = normalizeGuestEmail(raw);
  return email.includes("@") && email.length <= 320 && !/\s/.test(email);
}

export async function findGuestPaperPurchase(catalogKey: string, token: string) {
  const now = new Date();
  return prisma.pastPaperPurchase.findFirst({
    where: {
      catalogKey,
      downloadToken: token,
      status: "PAID",
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { gt: now } }],
    },
  });
}

/** Short hash for logs — never log full tokens. */
export function tokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}
