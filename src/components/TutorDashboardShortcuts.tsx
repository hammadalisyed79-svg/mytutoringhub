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
      description: "Browse & reply to ads",
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
      label: "Edit profile",
      description: "Your public listing",
      icon: "✎",
    },
    {
      href: "/dashboard/tutor/analytics",
      label: "Analytics",
      description: "Views & enquiries",
      icon: "▲",
    },
    {
      href: tutorDashboardTabHref(sp, "growth", "tutor-recommendations"),
      label: "Recommendations",
      description: "Grow your badge",
      icon: "◆",
    },
    {
      href: "/pricing",
      label: "Tutor add-ons",
      description: "Boost & verified",
      icon: "✦",
    },
    {
      href: "/dashboard/tutor/plan",
      label: "Your plan",
      description: "Basic & add-ons",
      icon: "◇",
    },
    {
      href: "/settings",
      label: "Settings",
      description: "Account & security",
      icon: "⚙",
    },
  ];

  return (
    <DashboardShortcutCards
      title="Shortcuts"
      lead="Quick access to growth tools and your listing."
      items={items}
    />
  );
}
