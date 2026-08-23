export function PageLoading({ title, lead = "Loading…" }: { title: string; lead?: string }) {
  return (
    <div className="page" role="status" aria-live="polite" aria-busy="true">
      <div className="container">
        <h1 className="page-title">{title}</h1>
        <p className="muted">{lead}</p>
      </div>
    </div>
  );
}
