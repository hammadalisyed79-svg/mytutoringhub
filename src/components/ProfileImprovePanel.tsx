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
              : "Finish required steps and save — eligible profiles appear in Find tutors automatically."}
          </p>
          {listingLive ? (
            <span className="badge badge-verified">Live</span>
          ) : (
            <span className="badge">Required fields first</span>
          )}
        </article>

        <article className="profile-improve-card">
          <strong>2. Get the Verified badge</strong>
          <p className="muted">
            Upload a government photo ID. Admins review privately. Students trust verified tutors more.
          </p>
          {verified ? (
            <span className="badge badge-verified">✓ Verified</span>
          ) : (
            <Link href="/dashboard/tutor?tab=profile#get-verified" className="btn btn-secondary btn-sm">
              Upload ID to verify
            </Link>
          )}
        </article>

        <article className="profile-improve-card">
          <strong>3. Earn a star tutor badge</strong>
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
          <strong>4. Optional paid boosts</strong>
          <p className="muted">
            Priority verification, highlighted listing, or a 30-day search boost — only if you want
            extra visibility.
          </p>
          <Link href="/dashboard/tutor?tab=growth" className="btn btn-secondary btn-sm">
            View plans &amp; boosts
          </Link>
        </article>
      </div>
    </section>
  );
}
