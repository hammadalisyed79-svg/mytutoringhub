"use client";

import { useMemo, useState } from "react";
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

  const setupStartStep = useMemo(
    () =>
      resolveTutorWizardResumeStep(
        {
          ...initial,
          name: displayName,
          subjectProfiles: initial.subjectProfiles as never,
        },
        {
          verified: initial.verified,
        },
      ),
    [initial, displayName],
  );

  const blockIndex = TUTOR_WORKSPACE_BLOCK_IDS.indexOf(block);

  function goTo(id: TutorWorkspaceBlockId) {
    setBlock(id);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goNextFrom(id: TutorWorkspaceBlockId) {
    const i = TUTOR_WORKSPACE_BLOCK_IDS.indexOf(id);
    const next = TUTOR_WORKSPACE_BLOCK_IDS[Math.min(i + 1, TUTOR_WORKSPACE_BLOCK_IDS.length - 1)];
    goTo(next);
  }

  function goBackFrom(id: TutorWorkspaceBlockId) {
    const i = TUTOR_WORKSPACE_BLOCK_IDS.indexOf(id);
    const prev = TUTOR_WORKSPACE_BLOCK_IDS[Math.max(i - 1, 0)];
    goTo(prev);
  }

  return (
    <section className="panel tutor-profile-workspace" id="tutor-profile">
      <div className="tutor-profile-workspace-head">
        <div>
          <h2>{profileComplete ? "My profile" : "Set up your tutor profile"}</h2>
          <p className="muted">
            6 blocks: setup (5 steps) → Teaching Profiles → 4 optional extras.
          </p>
        </div>
        <div className="tutor-profile-status-pills">
          <span className={`tutor-status-pill${initial.active ? " is-live" : ""}`}>
            {initial.active ? "Live" : "Setup"}
          </span>
          {initial.verified ? <span className="badge badge-verified">Verified</span> : null}
        </div>
      </div>

      <nav className="tutor-workspace-blocks" aria-label="Profile blocks">
        <ol className="tutor-workspace-blocks-list">
          {TUTOR_WORKSPACE_BLOCKS.map((row) => {
            const active = row.id === block;
            const done =
              (row.id === "setup" && setupComplete) ||
              (row.id === "subjects" && hasAnyTeachingProfile) ||
              (row.optional && TUTOR_WORKSPACE_BLOCK_IDS.indexOf(row.id) < blockIndex);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`tutor-workspace-block-btn${active ? " is-active" : ""}${done ? " is-done" : ""}`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => goTo(row.id)}
                >
                  <span className="tutor-workspace-block-num" aria-hidden="true">
                    {row.number}
                  </span>
                  <span className="tutor-workspace-block-copy">
                    <strong>
                      {row.title}
                      {row.optional ? <span className="tutor-workspace-optional"> Optional</span> : null}
                    </strong>
                    <span className="muted">{row.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {block === "setup" ? (
        <div className="tutor-workspace-block-panel" id="workspace-setup">
          <p className="eyebrow">Block 1 of 6 · Setup</p>
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
            <p className="eyebrow">Block 2 of 6</p>
            <h3 id="teaching-listings-section">Teaching Profiles</h3>
            <p className="muted">One subject per profile — students find you by subject and rate.</p>
          </header>
          <TutorAdsManager
            subjects={subjects}
            extraLevels={extraLevels}
            currency={currency}
            paidCheckoutLive={paidCheckoutLive}
          />
          <div className="guided-search-actions profile-wizard-actions profile-wizard-actions--sticky">
            <button type="button" className="btn btn-secondary" onClick={() => goBackFrom("subjects")}>
              Back
            </button>
            <div className="profile-wizard-actions-right">
              <button type="button" className="btn" onClick={() => goNextFrom("subjects")}>
                {hasAnyTeachingProfile ? "Next: optional extras" : "Skip to optional extras"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {block === "details" || block === "schedule" || block === "contact" || block === "verify" ? (
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
        />
      ) : null}
    </section>
  );
}
