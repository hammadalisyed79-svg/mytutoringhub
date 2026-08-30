"use client";

import Link from "next/link";
import { TutorTrustBadgePill } from "@/components/TutorTrustBadgePill";
import type { TutorTrustBadge } from "@/lib/tutor-badges";

export function ProfileImprovePanel({
  listingLive,
  verified,
  trustBadge = "NEW",
}: {
  listingLive: boolean;
  verified: boolean;
  trustBadge?: TutorTrustBadge | string;
}) {
  return (
    <section className="profile-improve panel">
      <h3 className="profile-improve-title">Improve your profile</h3>
      <p className="muted">
        A complete listing gets you found. Verification and star badges help you stand out and win
        more messages.
      </p>
      <div className="profile-improve-grid">
        <article className="profile-improve-card">
          <strong>1. Go live in search</strong>
          <p className="muted">
            {listingLive
              ? "Your listing is live. Keep subjects and availability up to date."
              : "Finish required steps and save a Teaching Profile — eligible profiles appear in Find tutors automatically."}
          </p>
          {listingLive ? (
            <span className="badge badge-verified">Live</span>
          ) : (
            <span className="badge">Required fields first</span>
          )}
        </article>

        <article className="profile-improve-card">
          <strong>2. Add board &amp; syllabus when relevant</strong>
          <p className="muted">
            On each Teaching Profile, set exam board, qualification, and syllabus code if you teach
            a specific curriculum (e.g. Cambridge 0580). Skip fields that do not apply.
          </p>
          <Link href="/dashboard/tutor?tab=profile#teaching-listings" className="btn btn-sm">
            Edit Teaching Profiles
          </Link>
        </article>

        <article className="profile-improve-card">
          <strong>3. Get the Identity Verified badge</strong>
          <p className="muted">
            Upload a government photo ID. Admins review privately. You cannot buy the badge —
            Priority Verification Review only jumps the queue.
          </p>
          {verified ? (
            <span className="badge badge-verified">✓ Verified</span>
          ) : (
            <Link href="/dashboard/tutor?tab=profile&verify=1" className="btn btn-secondary btn-sm">
              Upload ID to verify
            </Link>
          )}
        </article>

        <article className="profile-improve-card">
          <strong>4. Earn a star tutor badge</strong>
          <p className="muted">
            Progress from New Tutor → Recommended → Super → Top with verified recommendations and
            student reviews.
          </p>
          <div className="profile-improve-badge-row">
            <TutorTrustBadgePill badge={trustBadge} size="sm" />
            <Link href="/dashboard/tutor?tab=growth#tutor-recommendations" className="btn btn-sm">
              Request recommendations
            </Link>
          </div>
        </article>

        <article className="profile-improve-card">
          <strong>5. Optional Listing Boost</strong>
          <p className="muted">
            Boost one teaching listing for 30 days among relevant matches — never above strong
            subject fit. Priority Verification Review is separate from the badge.
          </p>
          <Link href="/dashboard/tutor?tab=growth" className="btn btn-secondary btn-sm">
            View plans &amp; boosts
          </Link>
        </article>
      </div>
    </section>
  );
}
