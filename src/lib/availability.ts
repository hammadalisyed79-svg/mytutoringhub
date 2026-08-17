export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type AvailabilitySlot = {
  day: Weekday;
  start: string;
  end: string;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function availabilityTimeOptions() {
  const out: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 22 && minute === 30) continue;
      out.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return out;
}

export function emptyAvailabilitySlot(): AvailabilitySlot {
  return { day: "Monday", start: "16:00", end: "18:00" };
}

function isSlot(value: unknown): value is AvailabilitySlot {
  if (!value || typeof value !== "object") return false;
  const row = value as AvailabilitySlot;
  return (
    WEEKDAYS.includes(row.day as Weekday) &&
    TIME_RE.test(row.start) &&
    TIME_RE.test(row.end) &&
    row.start < row.end
  );
}

export function parseAvailability(raw?: string | null): AvailabilitySlot[] {
  if (!raw?.trim()) return [];
  try {
    const data = JSON.parse(raw) as { slots?: unknown } | unknown;
    const list = Array.isArray(data) ? data : (data as { slots?: unknown }).slots;
    if (!Array.isArray(list)) return [];
    return list.filter(isSlot);
  } catch {
    return [];
  }
}

export function serializeAvailability(slots: AvailabilitySlot[]) {
  const clean = slots.filter(isSlot);
  return clean.length ? JSON.stringify({ slots: clean }) : "";
}

export function formatAvailabilityLines(raw?: string | null): string[] {
  const slots = parseAvailability(raw);
  if (slots.length) return slots.map((slot) => `${slot.day} ${slot.start}–${slot.end}`);
  const text = (raw || "").trim();
  if (text && !text.startsWith("{") && !text.startsWith("[")) return [text];
  return [];
}

export const EXPERIENCE_YEAR_OPTIONS = [
  { value: 0, label: "Less than 1 year" },
  ...Array.from({ length: 20 }, (_, i) => {
    const value = i + 1;
    return { value, label: value === 1 ? "1 year" : `${value} years` };
  }),
  { value: 21, label: "More than 20 years" },
];

export function formatExperienceYears(years?: number | null) {
  if (years == null || !Number.isFinite(years)) return "";
  const match = EXPERIENCE_YEAR_OPTIONS.find((row) => row.value === years);
  return match?.label || `${Math.round(years)} years`;
}
