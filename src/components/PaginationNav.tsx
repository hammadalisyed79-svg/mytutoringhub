import Link from "next/link";

function buildPageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 1) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | "gap")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push("gap");
  for (let i = left; i <= right; i += 1) items.push(i);
  if (right < total - 1) items.push("gap");
  if (total > 1) items.push(total);

  return items;
}

export function PaginationNav({
  page,
  pages,
  hrefForPage,
  label = "Pages",
}: {
  page: number;
  pages: number;
  hrefForPage: (pageNum: number) => string;
  label?: string;
}) {
  if (pages <= 1) return null;

  const items = buildPageItems(page, pages);

  return (
    <nav className="pagination-nav" aria-label={label}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className="pagination-btn" rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className="pagination-btn is-disabled" aria-hidden>
          ← Previous
        </span>
      )}

      <div className="pagination-pages">
        {items.map((item, idx) =>
          item === "gap" ? (
            <span key={`gap-${idx}`} className="pagination-gap" aria-hidden>
              …
            </span>
          ) : (
            <Link
              key={item}
              href={hrefForPage(item)}
              className={`pagination-page ${item === page ? "is-active" : ""}`}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </Link>
          ),
        )}
      </div>

      {page < pages ? (
        <Link href={hrefForPage(page + 1)} className="pagination-btn" rel="next">
          Next →
        </Link>
      ) : (
        <span className="pagination-btn is-disabled" aria-hidden>
          Next →
        </span>
      )}
    </nav>
  );
}
