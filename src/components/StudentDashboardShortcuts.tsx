import { DashboardShortcutCards } from "@/components/DashboardShortcutCards";

const SHORTCUTS = [
  {
    href: "/messages",
    label: "Messages",
    description: "Chat with tutors",
    icon: "◎",
  },
  {
    href: "/search",
    label: "Find tutors",
    description: "Search by subject & city",
    icon: "◇",
  },
  {
    href: "/ads/new",
    label: "Post a request",
    description: "Tell tutors what you need",
    icon: "✦",
  },
  {
    href: "/ads",
    label: "Student requests",
    description: "Browse open requests",
    icon: "▣",
  },
  {
    href: "/past-papers",
    label: "Past papers",
    description: "Exam practice library",
    icon: "▤",
  },
  {
    href: "/assistant",
    label: "Study assistant",
    description: "AI study coach",
    icon: "◈",
  },
  {
    href: "/dashboard/student/plan",
    label: "Your plan",
    description: "Pass & billing",
    icon: "◆",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Account & security",
    icon: "⚙",
  },
] as const;

export function StudentDashboardShortcuts({ unread = 0 }: { unread?: number }) {
  const items = SHORTCUTS.map((item) => ({
    ...item,
    badge:
      item.href === "/messages" && unread > 0 ? `${unread} unread` : undefined,
  }));

  return <DashboardShortcutCards items={items} />;
}
