import { requireAdminPage } from "@/lib/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { AdminSettingsForm } from "@/components/AdminActions";

export const metadata = { title: "Settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const settings = await getSiteSettings();

  return (
    <>
      <div>
        <h1 className="page-title">Site settings</h1>
        <p className="muted">Maintenance, announcement banner, signups, and the study assistant.</p>
      </div>
      <AdminSettingsForm settings={settings} />
    </>
  );
}
