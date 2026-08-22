export type RegisterRole = "STUDENT" | "TUTOR";

/** Resolve signup role from ?intent= or legacy ?role= query params. */
export function registerRoleFromParams(
  intent: string | null | undefined,
  role: string | null | undefined,
): RegisterRole {
  const value = (intent ?? role)?.trim().toLowerCase();
  if (value === "tutor") return "TUTOR";
  return "STUDENT";
}

export function registerHref(intent: "student" | "tutor") {
  return `/register?intent=${intent}`;
}
