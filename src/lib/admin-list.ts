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
