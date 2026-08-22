import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata(
  "Study tools",
  "Free browser-based study tools on My Tutoring Hub — exam countdown and progress log.",
);

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
