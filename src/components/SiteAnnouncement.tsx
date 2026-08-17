import { getSiteSettings } from "@/lib/site-settings";

export async function SiteAnnouncement() {
  const settings = await getSiteSettings();
  const text = settings.homepageAnnouncement?.trim();
  if (!text || settings.maintenanceMode) return null;
  return (
    <div className="site-banner" role="status">
      <div className="container">{text}</div>
    </div>
  );
}
