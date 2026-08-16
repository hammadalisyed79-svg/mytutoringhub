"use client";

export function AdminActions() {
  async function act(action: string, id: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    window.location.reload();
  }

  return { act };
}

export function AdminHideAdButton({ id }: { id: string }) {
  return (
    <button className="link-btn" type="button" onClick={() => fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide_ad", id }),
    }).then(() => window.location.reload())}>
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
