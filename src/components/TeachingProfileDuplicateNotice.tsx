import { formatTeachingProfileDuplicateMessage } from "@/lib/teaching-profile-duplicates";

export function TeachingProfileDuplicateNotice({
  canonicalLabels,
  message,
}: {
  canonicalLabels?: string[];
  message?: string | null;
}) {
  const text =
    message?.trim() ||
    (canonicalLabels?.length ? formatTeachingProfileDuplicateMessage(canonicalLabels) : "");
  if (!text) return null;

  return (
    <div className="tutor-profile-hidden-note teaching-profile-duplicate-notice" role="status">
      <strong>Duplicate Teaching Profiles.</strong> {text}. Existing listings stay as they are —
      nothing is merged or removed yet.
    </div>
  );
}
