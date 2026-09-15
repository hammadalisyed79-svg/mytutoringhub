import { DashboardShortcutCards } from "@/components/DashboardShortcutCards";
import {
  type DashboardSearchParams,
  tutorDashboardTabHref,
} from "@/lib/dashboard-home";

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
  const editProfileHref = tutorDashboardTabHref(sp, "profile");

  const items = [
    {
      href: teachingProfilesHref,
      label: "Teaching Profiles",
      description: "Listings, rates & Listing Boost",
      icon: "▤",
    },
    {
      href: editProfileHref,
      label: "Edit profile",
      description: "Photo, bio & subjects",
      icon: "✎",
    },
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
      href: "/dashboard/tutor/plan",
      label: "Your plan",
      description: "Tutor Pro, slips & add-ons",
      icon: "◆",
    },
    {
      href: "/pricing?plan=AD_BOOST",
      label: "Plans & boosts",
      description: "Tutor Pro & Listing Boost",
      icon: "✦",
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
            description: "See how students see you",
            icon: "◐",
            external: true as const,
          },
        ]
      : []),
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
      lead="Jump to Teaching Profiles, messages, plan, and boosts."
      items={items}
    />
  );
}
