/** Bind Boost / Highlight purchases to a single SubjectProfile via subscription.notes. */
import {
  encodePurchaseNotes,
  parsePurchaseNotes,
  type PurchaseCheckoutNotes,
} from "@/lib/purchase-context";

export const SUBJECT_PROFILE_NOTE_KEY = "subjectProfileId";

export function encodeSubjectProfileNote(subjectProfileId: string): string {
  return encodePurchaseNotes({ subjectProfileId }) || `${SUBJECT_PROFILE_NOTE_KEY}=${subjectProfileId}`;
}

export function encodeCheckoutNotes(opts: PurchaseCheckoutNotes): string | null {
  return encodePurchaseNotes(opts);
}

export function parseSubjectProfileIdFromNotes(notes?: string | null): string | null {
  return parsePurchaseNotes(notes).subjectProfileId || null;
}

export function parseCheckoutReturnUrl(notes?: string | null): string | null {
  return parsePurchaseNotes(notes).returnUrl || null;
}
