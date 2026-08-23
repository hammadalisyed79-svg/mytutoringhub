import { PageLoading } from "@/components/PageLoading";

/** Fallback for top-level routes without their own loading.tsx (not the homepage). */
export default function Loading() {
  return <PageLoading title="Loading" lead="Loading…" />;
}
