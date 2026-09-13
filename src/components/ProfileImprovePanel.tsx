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
      <p className="muted">Stand out with verification and recommendations.</p>
      <div className="profile-improve-grid">
        <article className="profile-improve-card">
          <strong>1. Go live in search</strong>
          <p className="muted">
            {listingLive
              ? "Your listing is live."
              : "Save a Teaching Profile below to appear in Find tutors."}
          </p>
          {listingLive ? (
            <span className="badge badge-verified">Live</span>
          ) : (
            <a href="#teaching-listings" className="btn btn-sm">
              Add Teaching Profile
            </a>
          )}
        </article>

        <article className="profile-improve-card">
          <strong>2. Get Identity Verified</strong>
          <p className="muted">Upload a government photo ID for admin review.</p>
          {verified ? (
            <span className="badge badge-verified">✓ Verified</span>
          ) : (
            <Link href="/dashboard/tutor?tab=profile&verify=1" className="btn btn-secondary btn-sm">
              Upload ID
            </Link>
          )}
        </article>

        <article className="profile-improve-card">
          <strong>3. Earn a star badge</strong>
          <p className="muted">Grow from New Tutor with recommendations and reviews.</p>
          <div className="profile-improve-badge-row">
            <TutorTrustBadgePill badge={trustBadge} size="sm" />
            <Link href="/dashboard/tutor?tab=growth#tutor-recommendations" className="btn btn-sm">
              Request recommendations
            </Link>
          </div>
        </article>

        <article className="profile-improve-card">
          <strong>4. Optional Listing Boost</strong>
          <p className="muted">Boost one subject for stronger placement — does not add capacity.</p>
          <a href="#teaching-listings" className="btn btn-sm">
            Boost a profile
          </a>
        </article>
      </div>
    </section>
  );
}
