import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Messages");

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
