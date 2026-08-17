import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSiteSettings } from "@/lib/site-settings";

export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  if (!settings.maintenanceMode) return <>{children}</>;

  const session = await auth();
  if (session?.user?.role === "ADMIN") return <>{children}</>;

  const pathname = (await headers()).get("x-pathname") || "";
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/register/complete" ||
    pathname.startsWith("/api/auth")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <section className="panel">
          <h1 className="page-title">We’ll be back shortly</h1>
          <p>
            My Tutoring Hub is under brief maintenance. Existing accounts are safe — please try again
            soon.
          </p>
          {settings.homepageAnnouncement && <p className="muted">{settings.homepageAnnouncement}</p>}
          <p className="muted">
            Admins can still <a href="/login">log in</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
