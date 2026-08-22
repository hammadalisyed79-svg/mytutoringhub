import {
  highlightModerationFlags,
  moderationCategoryLabel,
  type MessageModerationResult,
  type ModerationCategory,
} from "@/lib/message-moderation";

const SEVERITY_CLASS = {
  low: "mod-risk-low",
  medium: "mod-risk-medium",
  high: "mod-risk-high",
} as const;

export function AdminModerationBadge({
  result,
  compact,
}: {
  result: MessageModerationResult;
  compact?: boolean;
}) {
  if (!result.flagged || !result.severity) return null;

  const categories = [...new Set(result.flags.map((f) => f.category))];
  const label = compact
    ? `${result.severity.toUpperCase()} risk`
    : categories.map((c) => moderationCategoryLabel(c)).join(" · ");

  return (
    <span className={`admin-mod-badge ${SEVERITY_CLASS[result.severity]}`} title={label}>
      ⚠ {compact ? label : `Flagged · ${label}`}
    </span>
  );
}

export function AdminModerationReasons({ result }: { result: MessageModerationResult }) {
  if (!result.flagged) return null;

  const unique = new Map<string, { category: ModerationCategory; label: string }>();
  for (const flag of result.flags) {
    unique.set(`${flag.category}:${flag.label}`, flag);
  }

  return (
    <ul className="admin-mod-reasons">
      {[...unique.values()].map((flag) => (
        <li key={`${flag.category}-${flag.label}`}>
          <strong>{moderationCategoryLabel(flag.category)}:</strong> {flag.label}
        </li>
      ))}
    </ul>
  );
}

export function AdminHighlightedMessageBody({
  body,
  result,
}: {
  body: string;
  result: MessageModerationResult;
}) {
  if (!result.flagged) {
    return <p className="admin-message-body">{body}</p>;
  }

  const segments = highlightModerationFlags(body, result.flags);
  return (
    <p className="admin-message-body">
      {segments.map((segment, i) =>
        segment.highlight ? (
          <mark key={i} className="admin-mod-highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
