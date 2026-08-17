export const VERIFY_SLOTS = ["id", "qualification", "teaching"] as const;
export type VerifySlot = (typeof VERIFY_SLOTS)[number];
export type VerifySide = "front" | "back";

export const ID_TYPES = ["Passport", "National ID / CNIC", "Driving licence"] as const;
export type IdType = (typeof ID_TYPES)[number];

export type ParsedVerifyFile = {
  slot: VerifySlot;
  idType?: IdType;
  side: VerifySide;
  url: string;
};

const SLOT_LABEL: Record<VerifySlot, string> = {
  id: "Photo ID",
  qualification: "Qualification",
  teaching: "Teaching certificate",
};

export function idNeedsBack(idType: string) {
  return idType !== "Passport";
}

export function slotNeedsBack(slot: VerifySlot, idType?: string) {
  if (slot === "id") return idNeedsBack(idType || "Passport");
  return false;
}

export function parseVerificationDocs(docUrls?: string | null): ParsedVerifyFile[] {
  if (!docUrls?.trim()) return [];
  const out: ParsedVerifyFile[] = [];
  for (const rawLine of docUrls.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const idMatch = line.match(/^Photo ID \((.+?)\)(?:\s+(front|back))?:\s+(\S+)/i);
    if (idMatch) {
      const idType = ID_TYPES.find((type) => type.toLowerCase() === idMatch[1].toLowerCase());
      out.push({
        slot: "id",
        idType,
        side: (idMatch[2]?.toLowerCase() as VerifySide) || "front",
        url: idMatch[3],
      });
      continue;
    }
    const other = line.match(/^(Qualification|Teaching certificate)(?:\s+(front|back))?:\s+(\S+)/i);
    if (other) {
      out.push({
        slot: other[1].toLowerCase().startsWith("teaching") ? "teaching" : "qualification",
        side: (other[2]?.toLowerCase() as VerifySide) || "front",
        url: other[3],
      });
    }
  }
  return out;
}

export function filesForSlot(docs: ParsedVerifyFile[], slot: VerifySlot) {
  const rows = docs.filter((row) => row.slot === slot);
  return {
    front: rows.find((row) => row.side === "front")?.url || "",
    back: rows.find((row) => row.side === "back")?.url || "",
    idType: rows.find((row) => row.idType)?.idType,
  };
}

export function approvedSlots(requests: { status: string; docUrls: string }[]) {
  const locked = new Set<VerifySlot>();
  const files: Partial<Record<VerifySlot, ReturnType<typeof filesForSlot>>> = {};
  for (const request of requests) {
    if (request.status !== "APPROVED") continue;
    const docs = parseVerificationDocs(request.docUrls);
    for (const slot of VERIFY_SLOTS) {
      const pair = filesForSlot(docs, slot);
      if (pair.front || pair.back) {
        locked.add(slot);
        files[slot] = pair;
      }
    }
  }
  return { locked, files };
}

export function buildVerificationDocUrls(input: {
  idType: string;
  id: { front: string; back: string };
  qualification: { front: string; back: string };
  teaching: { front: string; back: string };
}) {
  const lines: string[] = [];
  function add(slot: VerifySlot, sides: { front: string; back: string }) {
    const label = slot === "id" ? `${SLOT_LABEL.id} (${input.idType})` : SLOT_LABEL[slot];
    if (sides.front) lines.push(`${label} front: ${sides.front}`);
    if (sides.back) lines.push(`${label} back: ${sides.back}`);
  }
  add("id", input.id);
  add("qualification", input.qualification);
  add("teaching", input.teaching);
  return lines.join("\n");
}

export function verificationSubmitError(input: {
  idType: string;
  id: { front: string; back: string };
  qualification: { front: string; back: string };
  teaching: { front: string; back: string };
  skipId?: boolean;
}) {
  if (!input.skipId) {
    if (!input.id.front) {
      return input.idType === "Passport"
        ? "Upload the passport photo page."
        : "Upload the front of your government photo ID.";
    }
    if (idNeedsBack(input.idType) && !input.id.back) {
      return `Upload the back of your ${input.idType}.`;
    }
  }
  if (input.qualification.back && !input.qualification.front) {
    return "Upload the front of your qualification document.";
  }
  if (input.teaching.back && !input.teaching.front) {
    return "Upload the front of your teaching certificate.";
  }
  return "";
}

export function formatVerifySlotLabel(slot: VerifySlot, side: VerifySide, idType?: string) {
  if (slot === "id") {
    const type = idType || "Photo ID";
    if (type === "Passport" && side === "front") return "Passport photo page";
    return `${type} ${side}`;
  }
  const name = slot === "qualification" ? "Qualification" : "Teaching certificate";
  return `${name} ${side}`;
}
