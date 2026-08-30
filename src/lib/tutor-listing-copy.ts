export const DEFAULT_TUTOR_BIO = "New tutor — update your profile in the dashboard.";

export function isDefaultTutorBio(bio?: string | null) {
  const text = bio?.trim() || "";
  if (!text) return true;
  if (text === DEFAULT_TUTOR_BIO) return true;
  return /^New tutor\s*[—–-]\s*update (your|this) profile/i.test(text);
}

export function publicTutorBio(bio?: string | null, isOwner = false) {
  if (isOwner) return bio?.trim() || "";
  if (isDefaultTutorBio(bio)) return "";
  return bio?.trim() || "";
}

export const TUTOR_VERIFY_PROFILE_MESSAGE =
  "Please update your profile information to get verified badge.";
