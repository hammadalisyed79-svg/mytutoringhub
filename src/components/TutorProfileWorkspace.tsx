"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TutorProfileForm } from "@/components/TutorProfileForm";
import { TutorAdsManager } from "@/components/TutorAdsManager";
import { TutorProfileExtraStep } from "@/components/TutorProfileExtraStep";
import { ProfileImprovePanel } from "@/components/ProfileImprovePanel";
import {
  resolveTutorWizardResumeStep,
  resolveTutorWorkspaceBlock,
  TUTOR_WORKSPACE_BLOCKS,
  TUTOR_WORKSPACE_BLOCK_IDS,
  type TutorWorkspaceBlockId,
  type TutorWizardExtraId,
} from "@/lib/tutor-wizard";
import type { CurrencyCode } from "@/lib/currency";
import type { TutorTrustBadge } from "@/lib/tutor-badges";

type ProfileInitial = {
  headline?: string | null;
  bio: string;
  subjects: string;
  hourlyRate: number;
  location: string;
  country?: string | null;
  expertise?: string | null;
  online: boolean;
  inPerson: boolean;
  photoUrl?: string | null;
  photoCropX?: number | null;
  photoCropY?: number | null;
  photoCropZoom?: number | null;
  qualifications?: string | null;
  experienceYears?: number | null;
  teachingMethod?: string | null;
  languages?: string | null;
  levels?: string | null;
  availability?: string | null;
  videoUrl?: string | null;
  introVideoUrl?: string | null;
  offersFreeTrial?: boolean;
  phone?: string | null;
  active: boolean;
  verified: boolean;
  subjectProfiles: unknown[];
  name: string;
};

export function TutorProfileWorkspace({
  profileId,
  initial,
  displayName,
  subjects,
  extraLevels = [],
  emailVerified = true,
  trustBadge = "NEW",
  currency = "PKR",
  paidCheckoutLive = true,
  verifyRequested = false,
  setupComplete,
  hasValidTeachingProfile,
  hasAnyTeachingProfile,
  profileComplete,
}: {
  profileId: string;
  initial: ProfileInitial;
  displayName: string;
  subjects: string[];
  extraLevels?: string[];
  emailVerified?: boolean;
  trustBadge?: TutorTrustBadge | string;
  currency?: CurrencyCode;
  paidCheckoutLive?: boolean;
  verifyRequested?: boolean;
  setupComplete: boolean;
  hasValidTeachingProfile: boolean;
  hasAnyTeachingProfile: boolean;
  profileComplete: boolean;
}) {
  const startExtra = verifyRequested ? ("verify" as const) : null;
  const initialBlock = useMemo(
    () =>
      resolveTutorWorkspaceBlock({
        verifyRequested,
        setupComplete,
        hasTeachingProfile: hasAnyTeachingProfile,
        startExtra,
      }),
    [verifyRequested, setupComplete, hasAnyTeachingProfile, startExtra],
  );
  const [block, setBlock] = useState<TutorWorkspaceBlockId>(initialBlock);
  const stageRef = useRef<HTMLDivElement>(null);

  const setupStartStep = useMemo(
    () =>
      resolveTutorWizardResumeStep(
        {
          ...initial,
          name: displayName,
          subjectProfiles: initial.subjectProfiles as never,
        },
        { verified: initial.verified },
      ),
    [initial, displayName],
  );

  const blockIndex = TUTOR_WORKSPACE_BLOCK_IDS.indexOf(block);
  const activeBlock = TUTOR_WORKSPACE_BLOCKS[blockIndex] || TUTOR_WORKSPACE_BLOCKS[0];
  const journeyPct = Math.round(((blockIndex + 1) / TUTOR_WORKSPACE_BLOCKS.length) * 100);

  function scrollToForm() {
    // Wait a frame so the new block panel is in the DOM before scrolling.
    requestAnimationFrame(() => {
      stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goTo(id: TutorWorkspaceBlockId) {
    setBlock(id);
    scrollToForm();
  }

  function goNextFrom(id: TutorWorkspaceBlockId) {
    const i = TUTOR_WORKSPACE_BLOCK_IDS.indexOf(id);
    goTo(TUTOR_WORKSPACE_BLOCK_IDS[Math.min(i + 1, TUTOR_WORKSPACE_BLOCK_IDS.length - 1)]);
  }

  function goBackFrom(id: TutorWorkspaceBlockId) {
    const i = TUTOR_WORKSPACE_BLOCK_IDS.indexOf(id);
    goTo(TUTOR_WORKSPACE_BLOCK_IDS[Math.max(i - 1, 0)]);
  }

  return (
    <section className="panel tutor-profile-workspace is-luxe" id="tutor-profile">
      <header className="tutor-profile-workspace-head">
        <div>
          <p className="eyebrow">{profileComplete ? "Your listing" : "Welcome"}</p>
          <h2>{profileComplete ? "My profile" : "Set up your tutor profile"}</h2>
          <p className="muted tutor-workspace-lead">
            {profileComplete
              ? "Refine your presence anytime — move through each stage at your pace."
              : "A calm path from profile to subjects. Optional polish comes after."}
          </p>
          <div className="tutor-workspace-preview-actions">
            <Link
              className="btn btn-secondary btn-sm"
              href={`/tutors/${profileId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              See how students see you
            </Link>
          </div>
        </div>
        <div className="tutor-profile-status-pills">
          <span className={`tutor-status-pill${initial.active ? " is-live" : ""}`}>
            {initial.active ? "Live in search" : "In setup"}
          </span>
          {initial.verified ? <span className="badge badge-verified">Verified</span> : null}
        </div>
      </header>

      <div className="tutor-workspace-journey" aria-hidden="true">
        <div className="tutor-workspace-journey-track">
          <div className="tutor-workspace-journey-fill" style={{ width: `${journeyPct}%` }} />
        </div>
        <p className="tutor-workspace-journey-label">
          Stage {activeBlock.number} of {TUTOR_WORKSPACE_BLOCKS.length}
          {activeBlock.optional ? " · Optional" : ""}
        </p>
      </div>

      <nav className="tutor-workspace-blocks" aria-label="Profile stages">
        <ol className="tutor-workspace-blocks-list">
          {TUTOR_WORKSPACE_BLOCKS.map((row) => {
            const active = row.id === block;
            const done =
              (row.id === "setup" && setupComplete) ||
              (row.id === "subjects" && hasAnyTeachingProfile) ||
              (row.optional && TUTOR_WORKSPACE_BLOCK_IDS.indexOf(row.id) < blockIndex);
            const incomplete = !done && !active && (!row.optional || TUTOR_WORKSPACE_BLOCK_IDS.indexOf(row.id) < blockIndex);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`tutor-workspace-block-btn${active ? " is-active" : ""}${done ? " is-done" : ""}${incomplete ? " is-incomplete" : ""}`}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${row.number}. ${row.title}${row.optional ? " (optional)" : ""}${incomplete ? " — incomplete" : ""}`}
                  title={row.hint}
                  onClick={() => goTo(row.id)}
                >
                  <span className="tutor-workspace-block-num" aria-hidden="true">
                    {done && !active ? "✓" : row.number}
                  </span>
                  <span className="tutor-workspace-block-copy">
                    <strong>
                      <span className="tutor-workspace-title-full">{row.title}</span>
                      <span className="tutor-workspace-title-short">{row.shortTitle}</span>
                    </strong>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="tutor-workspace-stage" ref={stageRef} id="tutor-workspace-form">
        {block === "setup" ? (
          <div className="tutor-workspace-block-panel" id="workspace-setup">
            <TutorProfileForm
              initial={initial}
              displayName={displayName}
              subjects={subjects}
              extraLevels={extraLevels}
              emailVerified={emailVerified}
              listingActive={initial.active}
              verified={initial.verified}
              currency={currency}
              startStep={setupStartStep}
              hasValidTeachingProfile={hasValidTeachingProfile}
              hasAnyTeachingProfile={hasAnyTeachingProfile}
              onSetupComplete={() => goTo("subjects")}
            />
          </div>
        ) : null}

        {block === "subjects" ? (
          <div className="tutor-workspace-block-panel" id="teaching-listings">
            <header className="tutor-workspace-block-intro">
              <h3 className="tutor-workspace-heading" id="teaching-listings-section">
                Teaching Profiles
              </h3>
              <p className="muted">One subject each — students find you by subject and rate.</p>
            </header>
            <TutorAdsManager
              subjects={subjects}
              extraLevels={extraLevels}
              currency={currency}
              paidCheckoutLive={paidCheckoutLive}
            />
            <div className="guided-search-actions profile-wizard-actions profile-wizard-actions--sticky profile-wizard-actions--luxe">
              <button type="button" className="btn btn-secondary" onClick={() => goBackFrom("subjects")}>
                Back
              </button>
              <div className="profile-wizard-actions-right">
                <button type="button" className="btn" onClick={() => goNextFrom("subjects")}>
                  {hasAnyTeachingProfile ? "Continue" : "Skip for now"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {block === "details" ||
        block === "schedule" ||
        block === "contact" ||
        block === "verify" ? (
          <TutorProfileExtraStep
            blockId={block as TutorWizardExtraId}
            initial={{
              name: displayName,
              headline: initial.headline,
              subjects: initial.subjects,
              expertise: initial.expertise,
              levels: initial.levels,
              languages: initial.languages,
              location: initial.location,
              country: initial.country,
              experienceYears: initial.experienceYears,
              teachingMethod: initial.teachingMethod,
              availability: initial.availability,
              introVideoUrl: initial.introVideoUrl,
              phone: initial.phone,
              offersFreeTrial: initial.offersFreeTrial,
              online: initial.online,
              inPerson: initial.inPerson,
            }}
            verified={initial.verified}
            extraLevels={extraLevels}
            onBack={() => goBackFrom(block)}
            onSkip={() => goNextFrom(block)}
            onSavedNext={() => {
              if (block === "verify") {
                goTo("subjects");
                return;
              }
              goNextFrom(block);
            }}
          />
        ) : null}

        {block === "subjects" && initial.active ? (
          <ProfileImprovePanel
            listingLive={initial.active}
            verified={initial.verified}
            trustBadge={trustBadge}
            currency={currency}
            paidCheckoutLive={paidCheckoutLive}
            showPriorityCheckout={!initial.verified}
          />
        ) : null}
      </div>
    </section>
  );
}
