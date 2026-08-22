import { trustBadgeMeta, type TutorTrustBadge } from "@/lib/tutor-badges";

export function TutorTrustBadgePill({
  badge,
  size = "md",
}: {
  badge: string | null | undefined;
  size?: "sm" | "md";
}) {
  const meta = trustBadgeMeta(badge);
  const level = (meta.id || "NEW") as TutorTrustBadge;
  return (
    <span
      className={`tutor-trust-badge tutor-trust-badge--${level.toLowerCase()} tutor-trust-badge--${size}`}
      title={meta.label}
    >
      <span aria-hidden="true">{meta.emoji}</span> {meta.shortLabel}
    </span>
  );
}
