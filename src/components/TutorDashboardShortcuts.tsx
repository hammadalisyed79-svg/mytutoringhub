import { DashboardShortcutCards } from "@/components/DashboardShortcutCards";
import {
  type DashboardSearchParams,
  tutorDashboardTabHref,
} from "@/lib/dashboard-home";

export function TutorDashboardShortcuts({
  unread = 0,
  sp,
}: {
  unread?: number;
  sp: DashboardSearchParams;
}) {
  const items = [
    {
      href: "/ads",
      label: "Student requests",
      description: "Browse & reply",
      icon: "▣",
    },
    {
      href: "/messages",
      label: "Messages",
      description: "Chat with students",
      icon: "◎",
      badge: unread > 0 ? `${unread} unread` : undefined,
    },
    {
      href: tutorDashboardTabHref(sp, "profile"),
      label: "Profile & listings",
      description: "Edit & Teaching Profiles",
      icon: "✎",
    },
    {
      href: "/dashboard/tutor/analytics",
      label: "Analytics",
      description: "Views & enquiries",
      icon: "▲",
    },
  ];

  return (
    <DashboardShortcutCards
      title="Shortcuts"
      lead="The essentials while you grow."
      items={items}
    />
  );
}
