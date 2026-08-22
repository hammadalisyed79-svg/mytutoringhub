import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  type DashboardSearchParams,
  roleDashboardPath,
} from "@/lib/dashboard-home";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardIndexPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;
  redirect(roleDashboardPath(session.user.role, sp));
}
