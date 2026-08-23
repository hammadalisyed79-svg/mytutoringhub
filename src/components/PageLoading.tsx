export function PageLoading({ title, lead = "Loading…" }: { title: string; lead?: string }) {
  return (
    <div className="page page-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="container">
        {/* Use a paragraph, not H1 — avoids duplicate/ competing headings during streaming */}
        <p className="page-title">{title}</p>
        <p className="muted">{lead}</p>
      </div>
    </div>
  );
}
