import { prisma } from "@/lib/prisma";

export const SITE_SETTINGS_ID = "default";

export type SiteSettingsRow = {
  id: string;
  maintenanceMode: boolean;
  homepageAnnouncement: string;
  disableSignups: boolean;
  disableAiAssistant: boolean;
  updatedAt: Date;
};

const DEFAULTS: SiteSettingsRow = {
  id: SITE_SETTINGS_ID,
  maintenanceMode: false,
  homepageAnnouncement: "",
  disableSignups: false,
  disableAiAssistant: false,
  updatedAt: new Date(0),
};

let cached: { at: number; value: SiteSettingsRow } | null = null;
const TTL_MS = 8_000;

export function invalidateSiteSettingsCache() {
  cached = null;
}

export async function getSiteSettings(): Promise<SiteSettingsRow> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    let row = await prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
    if (!row) {
      row = await prisma.siteSettings.create({ data: { id: SITE_SETTINGS_ID } });
    }
    cached = { at: Date.now(), value: row };
    return row;
  } catch {
    return DEFAULTS;
  }
}

export async function saveSiteSettings(data: {
  maintenanceMode: boolean;
  homepageAnnouncement: string;
  disableSignups: boolean;
  disableAiAssistant: boolean;
}) {
  const row = await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: { id: SITE_SETTINGS_ID, ...data },
    update: data,
  });
  cached = { at: Date.now(), value: row };
  return row;
}
