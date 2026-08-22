import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Admin");
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="page">
      <div className="container admin-shell">
        <AdminNav />
        <div className="admin-main stack-lg">{children}</div>
      </div>
    </div>
  );
}
