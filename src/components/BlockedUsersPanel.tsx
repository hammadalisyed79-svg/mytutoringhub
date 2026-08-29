"use client";

import { useCallback, useEffect, useState } from "react";

type BlockRow = {
  id: string;
  blockedUserId: string;
  name: string | null;
  createdAt: string;
};

/** Settings panel: list and unblock users you have blocked. */
export function BlockedUsersPanel() {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blocks");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Could not load blocked users");
        setBlocks([]);
        return;
      }
      setBlocks(Array.isArray((data as { blocks?: BlockRow[] }).blocks) ? data.blocks : []);
    } catch {
      setError("Could not load blocked users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(blockedUserId: string) {
    setBusyId(blockedUserId);
    setError("");
    const res = await fetch(`/api/blocks?blockedUserId=${encodeURIComponent(blockedUserId)}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Could not unblock");
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.blockedUserId !== blockedUserId));
  }

  return (
    <section className="panel" style={{ marginTop: "1.5rem" }}>
      <h2 style={{ marginTop: 0 }}>Blocked users</h2>
      <p className="muted">
        Blocked users cannot message you, and you cannot message them. Unblock anytime.
      </p>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && blocks.length === 0 && <p className="muted">No blocked users.</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {blocks.map((b) => (
          <li
            key={b.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0",
              borderBottom: "1px solid var(--border, #e5e7eb)",
            }}
          >
            <span>{b.name?.trim() || "User"}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busyId === b.blockedUserId}
              onClick={() => void unblock(b.blockedUserId)}
            >
              {busyId === b.blockedUserId ? "Unblocking…" : "Unblock"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
