/** Tutor invite URLs and share copy for WhatsApp, DMs, and email. */

export function tutorInvitePath(referrerId?: string | null) {
  if (referrerId?.trim()) {
    return `/become-a-tutor?ref=${encodeURIComponent(referrerId.trim())}`;
  }
  return "/become-a-tutor";
}

export function tutorRegisterPath(referrerId?: string | null) {
  if (referrerId?.trim()) {
    return `/register?role=tutor&ref=${encodeURIComponent(referrerId.trim())}`;
  }
  return "/register?role=tutor";
}

export function tutorInviteUrl(origin: string, referrerId?: string | null) {
  return `${origin.replace(/\/$/, "")}${tutorInvitePath(referrerId)}`;
}

export function tutorInviteMessage(link: string, referrerName?: string | null) {
  const intro = referrerName?.trim()
    ? `${referrerName.trim()} invited you to list on My Tutoring Hub`
    : "Join My Tutoring Hub — a worldwide tutoring directory";
  return `${intro}. Free listing — you keep 100% of lesson fees. Takes ~5 min: photo + subjects + rate.\n\n${link}`;
}

export function tutorInviteWhatsAppHref(link: string, referrerName?: string | null) {
  return `https://wa.me/?text=${encodeURIComponent(tutorInviteMessage(link, referrerName))}`;
}
