/** Build a query string for admin list pagination while preserving filters. */
export function adminListQuery(
  sp: Record<string, string | undefined>,
  page: number,
  omitKeys: string[] = [],
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (!v || omitKeys.includes(k) || k === "page") continue;
    params.set(k, v);
  }
  params.set("page", String(page));
  return params.toString();
}

export const ADMIN_PAGE_SIZE = 40;

export function csvEscape(v: string | number | boolean | null | undefined) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvResponse(
  filename: string,
  header: string[],
  rows: (string | number | boolean | null | undefined)[][],
) {
  const lines = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Preserve current filters as a query string for export links (no page). */
export function adminExportQuery(sp: Record<string, string | undefined>, type: string) {
  const params = new URLSearchParams();
  params.set("type", type);
  for (const [k, v] of Object.entries(sp)) {
    if (!v || k === "page" || k === "type") continue;
    params.set(k, v);
  }
  return params.toString();
}
