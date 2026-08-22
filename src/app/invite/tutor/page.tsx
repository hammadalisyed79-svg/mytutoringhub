import { redirect } from "next/navigation";

/** Short share URL — forwards to the main tutor landing page. */
export default async function InviteTutorRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const sp = await searchParams;
  const ref = sp.ref?.trim();
  redirect(ref ? `/become-a-tutor?ref=${encodeURIComponent(ref)}` : "/become-a-tutor");
}
