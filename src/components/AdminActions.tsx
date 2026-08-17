"use client";

export function AdminHideAdButton({ id }: { id: string }) {
  return (
    <button
      className="link-btn"
      type="button"
      onClick={() =>
        fetch("/api/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "hide_ad", id }),
        }).then(() => window.location.reload())
      }
    >
      Hide
    </button>
  );
}

export function AdminToggleTutorButton({ id, active }: { id: string; active: boolean }) {
  return (
    <button
      className="link-btn"
      type="button"
      onClick={() =>
        fetch("/api/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: active ? "deactivate_tutor" : "activate_tutor",
            id,
          }),
        }).then(() => window.location.reload())
      }
    >
      {active ? "Deactivate" : "Activate"}
    </button>
  );
}

export function AdminActionButton({
  action,
  id,
  label,
  extra,
}: {
  action: string;
  id: string;
  label: string;
  extra?: Record<string, unknown>;
}) {
  return (
    <button
      className="link-btn"
      type="button"
      onClick={() =>
        fetch("/api/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id, ...extra }),
        }).then(() => window.location.reload())
      }
    >
      {label}
    </button>
  );
}
