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
      icon: "📋",
    },
    {
      href: "/messages",
      label: "Messages",
      description: "Chat with students",
      icon: "✉",
      badge: unread > 0 ? `${unread} unread` : undefined,
    },
    {
      href: "/past-papers",
      label: "Past papers",
      description: "Share exam resources",
      icon: "📄",
    },
    {
      href: "/dashboard/tutor/analytics",
      label: "Analytics",
      description: "Views & enquiries",
      icon: "📈",
    },
    {
      href: tutorDashboardTabHref(sp, "growth", "tutor-recommendations"),
      label: "Recommendations",
      description: "Grow your badge",
      icon: "🏅",
    },
    {
      href: tutorDashboardTabHref(sp, "growth", "invite-tutor"),
      label: "Invite a tutor",
      description: "Earn referral points",
      icon: "🤝",
    },
    {
      href: tutorDashboardTabHref(sp, "profile"),
      label: "Edit profile",
      description: "Your public listing",
      icon: "✏",
    },
    {
      href: "/assistant",
      label: "Study assistant",
      description: "AI study coach",
      icon: "🎓",
    },
    {
      href: "/support",
      label: "AI support",
      description: "Help with your account",
      icon: "💬",
    },
    {
      href: "/dashboard/tutor/plan",
      label: "Your plan",
      description: "Basic & add-ons",
      icon: "⭐",
    },
    {
      href: "/pricing",
      label: "Tutor add-ons",
      description: "Boost & verified",
      icon: "🚀",
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
