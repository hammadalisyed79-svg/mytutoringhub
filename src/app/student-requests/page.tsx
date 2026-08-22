import { redirect } from "next/navigation";

/** Canonical student request board is /ads (StudentAd). */
export default function StudentRequestsRedirectPage() {
  redirect("/ads");
}
