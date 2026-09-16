import { DashboardShortcutCards } from "@/components/DashboardShortcutCards";
import {
  type DashboardSearchParams,
  tutorDashboardTabHref,
} from "@/lib/dashboard-home";

/** Primary destinations only — plan / boost / settings live under More tools. */
export function TutorDashboardShortcuts({
  unread = 0,
  sp,
  profileHref,
}: {
  unread?: number;
  sp: DashboardSearchParams;
  profileHref?: string | null;
}) {
  const teachingProfilesHref = tutorDashboardTabHref(sp, "profile", "teaching-listings");

  const items = [
    {
      href: teachingProfilesHref,
      label: "Teaching Profiles",
      description: "Listings, rates & boost",
      icon: "▤",
    },
    {
      href: "/messages",
      label: "Messages",
      description: "Chat with students",
      icon: "◎",
      badge: unread > 0 ? `${unread} unread` : undefined,
    },
    {
      href: "/ads",
      label: "Requests",
      description: "Browse & reply",
      icon: "▣",
    },
    {
      href: "/dashboard/tutor/analytics",
      label: "Analytics",
      description: "Views & enquiries",
      icon: "▲",
    },
    ...(profileHref
      ? [
          {
            href: profileHref,
            label: "Public profile",
            description: "How students see you",
            icon: "◐",
            external: true as const,
          },
        ]
      : []),
  ];

  return (
    <DashboardShortcutCards
      title="Shortcuts"
      lead="Listings, messages, and requests — the tools you use most."
      items={items}
    />
  );
}
