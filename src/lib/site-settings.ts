import { prisma } from "@/lib/prisma";
import type { PlanPriceOverride } from "@/lib/plans";

export const SITE_SETTINGS_ID = "default";

export type SiteSettingsRow = {
  id: string;
  maintenanceMode: boolean;
  homepageAnnouncement: string;
  disableSignups: boolean;
  disableAiAssistant: boolean;
  planPrices: Record<string, PlanPriceOverride>;
  updatedAt: Date;
};

const DEFAULTS: SiteSettingsRow = {
  id: SITE_SETTINGS_ID,
  maintenanceMode: false,
  homepageAnnouncement: "",
  disableSignups: false,
  disableAiAssistant: false,
  planPrices: {},
  updatedAt: new Date(0),
};

let cached: { at: number; value: SiteSettingsRow } | null = null;
const TTL_MS = 8_000;

export function invalidateSiteSettingsCache() {
  cached = null;
}

function parsePlanPrices(value: unknown): Record<string, PlanPriceOverride> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, PlanPriceOverride> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as PlanPriceOverride;
    const promoPrice = Number(row.promoPricePkr);
    out[key] = {
      ...(typeof row.pricePkr === "number" ? { pricePkr: row.pricePkr } : {}),
      ...(typeof row.name === "string" ? { name: row.name } : {}),
      ...(typeof row.description === "string" ? { description: row.description } : {}),
      ...(typeof row.promoEnabled === "boolean" ? { promoEnabled: row.promoEnabled } : {}),
      ...(Number.isFinite(promoPrice) ? { promoPricePkr: promoPrice } : {}),
      ...(typeof row.promoUntil === "string" ? { promoUntil: row.promoUntil } : {}),
      ...(typeof row.promoLabel === "string" ? { promoLabel: row.promoLabel } : {}),
      ...(typeof row.promoNote === "string" ? { promoNote: row.promoNote } : {}),
    };
  }
  return out;
}

function normalizeRow(row: {
  id: string;
  maintenanceMode: boolean;
  homepageAnnouncement: string;
  disableSignups: boolean;
  disableAiAssistant: boolean;
  updatedAt: Date;
  planPrices?: unknown;
}): SiteSettingsRow {
  return {
    id: row.id,
    maintenanceMode: row.maintenanceMode,
    homepageAnnouncement: row.homepageAnnouncement,
    disableSignups: row.disableSignups,
    disableAiAssistant: row.disableAiAssistant,
    planPrices: parsePlanPrices(row.planPrices),
    updatedAt: row.updatedAt,
  };
}

export async function getSiteSettings(): Promise<SiteSettingsRow> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    let row = await prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
    if (!row) {
      row = await prisma.siteSettings.create({ data: { id: SITE_SETTINGS_ID } });
    }
    const value = normalizeRow(row);
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULTS;
  }
}

export async function getPlanPriceOverrides() {
  const settings = await getSiteSettings();
  return settings.planPrices;
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
  const value = normalizeRow(row);
  cached = { at: Date.now(), value };
  return value;
}

export async function savePlanPrices(planPrices: Record<string, PlanPriceOverride>) {
  const row = await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    create: { id: SITE_SETTINGS_ID, planPrices },
    update: { planPrices },
  });
  const value = normalizeRow(row);
  cached = { at: Date.now(), value };
  return value;
}
