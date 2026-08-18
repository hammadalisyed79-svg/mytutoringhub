import { DOCUMENT_TYPE_LABELS } from "./constants";

const TYPE_ORDER = [
  "QUESTION_PAPER",
  "MARK_SCHEME",
  "EXAMINER_REPORT",
  "INSERT",
  "SOURCE_BOOKLET",
  "FORMULA_SHEET",
  "TRANSCRIPT",
  "SPECIMEN_PAPER",
  "SPECIMEN_MARK_SCHEME",
  "OTHER",
];

export type GroupablePaper = {
  id: string;
  catalogKey: string;
  year: number;
  session: string | null;
  componentCode: string | null;
  documentType: string | null;
  paperType: string;
};

export type PaperComponentGroup<T extends GroupablePaper> = {
  componentCode: string;
  papers: T[];
};

export type PaperSessionGroup<T extends GroupablePaper> = {
  session: string;
  components: PaperComponentGroup<T>[];
};

export type PaperYearGroup<T extends GroupablePaper> = {
  year: number;
  sessions: PaperSessionGroup<T>[];
};

function typeRank(documentType?: string | null) {
  const idx = TYPE_ORDER.indexOf(documentType || "");
  return idx === -1 ? TYPE_ORDER.length : idx;
}

function sessionRank(session?: string | null) {
  const value = (session || "").toLowerCase();
  if (value.includes("feb") || value.includes("mar")) return 0;
  if (value.includes("may") || value.includes("jun")) return 1;
  if (value.includes("oct") || value.includes("nov")) return 2;
  return 3;
}

export function groupPapersByYearSessionComponent<T extends GroupablePaper>(papers: T[]): PaperYearGroup<T>[] {
  const years = new Map<number, Map<string, Map<string, T[]>>>();
  for (const paper of papers) {
    const session = paper.session || "Session";
    const component = paper.componentCode || "other";
    if (!years.has(paper.year)) years.set(paper.year, new Map());
    const sessions = years.get(paper.year)!;
    if (!sessions.has(session)) sessions.set(session, new Map());
    const components = sessions.get(session)!;
    const list = components.get(component) || [];
    list.push(paper);
    components.set(component, list);
  }

  return [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, sessions]) => ({
      year,
      sessions: [...sessions.entries()]
        .sort((a, b) => sessionRank(a[0]) - sessionRank(b[0]) || a[0].localeCompare(b[0]))
        .map(([session, components]) => ({
          session,
          components: [...components.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
            .map(([componentCode, rows]) => ({
              componentCode,
              papers: [...rows].sort(
                (a, b) =>
                  typeRank(a.documentType) - typeRank(b.documentType) ||
                  a.paperType.localeCompare(b.paperType),
              ),
            })),
        })),
    }));
}

export function documentTypeShortLabel(documentType?: string | null, paperType?: string | null) {
  if (documentType && DOCUMENT_TYPE_LABELS[documentType]) return DOCUMENT_TYPE_LABELS[documentType];
  return paperType || "Paper";
}
