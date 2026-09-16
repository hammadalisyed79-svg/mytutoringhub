import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata(
  "Account settings",
  "Update your My Tutoring Hub name, phone, password, or delete your account.",
);

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
