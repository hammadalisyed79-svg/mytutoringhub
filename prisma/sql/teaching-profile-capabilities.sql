-- Teaching Profiles Phase 1 — additive DDL (Option A join table + ACTIVE-only uniqueness).
--
-- Repo historically uses `prisma db push` (no migrate history). Apply this file with psql
-- against DATABASE_URL_UNPOOLED when promoting the schema. After apply, `prisma db push`
-- should only reconcile indexes Prisma knows about (it cannot create the partial unique index).
--
-- SAFE:
--   * Does not delete, merge, pause, or redirect SubjectProfile rows.
--   * Does not change listing ids / `/listings/{id}`.
--   * Does not drop scalar level/board/qualification/syllabusCode.
--   * Partial unique index is created ONLY when there are zero ACTIVE collisions on
--     (tutorProfileId, lower(btrim(canonicalSubject))). Otherwise it RAISES NOTICE and skips.
--
-- Canonical-subject SQL backfill is a first-pass copy of `subject` (trim only).
-- Alias-aware keys (Maths → Mathematics, GCSE Maths → Mathematics) are computed by
-- src/lib/teaching-profile-subject.ts. Phase 3 dry-run lists would-backfill values;
-- do not UPDATE production rows here. Do not CREATE the unique index while collisions exist.

ALTER TABLE "SubjectProfile"
  ADD COLUMN IF NOT EXISTS "canonicalSubject" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "SubjectProfile_tutorProfileId_canonicalSubject_idx"
  ON "SubjectProfile" ("tutorProfileId", "canonicalSubject");

CREATE INDEX IF NOT EXISTS "SubjectProfile_canonicalSubject_status_idx"
  ON "SubjectProfile" ("canonicalSubject", "status");

CREATE TABLE IF NOT EXISTS "SubjectProfileCapability" (
  "id" TEXT NOT NULL,
  "subjectProfileId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubjectProfileCapability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubjectProfileCapability_kind_check"
    CHECK ("kind" IN ('LEVEL', 'BOARD', 'QUALIFICATION', 'SYLLABUS_CODE')),
  CONSTRAINT "SubjectProfileCapability_subjectProfileId_fkey"
    FOREIGN KEY ("subjectProfileId") REFERENCES "SubjectProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubjectProfileCapability_subjectProfileId_kind_value_key"
  ON "SubjectProfileCapability" ("subjectProfileId", "kind", "value");

CREATE INDEX IF NOT EXISTS "SubjectProfileCapability_kind_value_idx"
  ON "SubjectProfileCapability" ("kind", "value");

CREATE INDEX IF NOT EXISTS "SubjectProfileCapability_subjectProfileId_kind_idx"
  ON "SubjectProfileCapability" ("subjectProfileId", "kind");

-- First-pass canonical key: trimmed subject as stored. Does not apply aliases.
UPDATE "SubjectProfile"
SET "canonicalSubject" = btrim("subject")
WHERE btrim("canonicalSubject") = '' AND btrim("subject") <> '';

-- Snapshot scalars into the join table (idempotent). Writers still use scalars until Phase 2/5.
INSERT INTO "SubjectProfileCapability" ("id", "subjectProfileId", "kind", "value")
SELECT gen_random_uuid()::text, sp.id, 'LEVEL', btrim(sp."level")
FROM "SubjectProfile" sp
WHERE sp."level" IS NOT NULL
  AND btrim(sp."level") <> ''
  AND lower(btrim(sp."level")) <> 'all levels'
  AND NOT EXISTS (
    SELECT 1
    FROM "SubjectProfileCapability" c
    WHERE c."subjectProfileId" = sp.id
      AND c."kind" = 'LEVEL'
      AND c."value" = btrim(sp."level")
  );

INSERT INTO "SubjectProfileCapability" ("id", "subjectProfileId", "kind", "value")
SELECT gen_random_uuid()::text, sp.id, 'BOARD', btrim(sp."board")
FROM "SubjectProfile" sp
WHERE sp."board" IS NOT NULL
  AND btrim(sp."board") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "SubjectProfileCapability" c
    WHERE c."subjectProfileId" = sp.id
      AND c."kind" = 'BOARD'
      AND c."value" = btrim(sp."board")
  );

INSERT INTO "SubjectProfileCapability" ("id", "subjectProfileId", "kind", "value")
SELECT gen_random_uuid()::text, sp.id, 'QUALIFICATION', btrim(sp."qualification")
FROM "SubjectProfile" sp
WHERE sp."qualification" IS NOT NULL
  AND btrim(sp."qualification") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "SubjectProfileCapability" c
    WHERE c."subjectProfileId" = sp.id
      AND c."kind" = 'QUALIFICATION'
      AND c."value" = btrim(sp."qualification")
  );

INSERT INTO "SubjectProfileCapability" ("id", "subjectProfileId", "kind", "value")
SELECT gen_random_uuid()::text, sp.id, 'SYLLABUS_CODE', upper(btrim(sp."syllabusCode"))
FROM "SubjectProfile" sp
WHERE sp."syllabusCode" IS NOT NULL
  AND btrim(sp."syllabusCode") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "SubjectProfileCapability" c
    WHERE c."subjectProfileId" = sp.id
      AND c."kind" = 'SYLLABUS_CODE'
      AND c."value" = upper(btrim(sp."syllabusCode"))
  );

-- ACTIVE-only uniqueness. Skipped when live duplicates would make CREATE UNIQUE INDEX fail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SubjectProfile"
    WHERE status = 'ACTIVE'
      AND btrim("canonicalSubject") <> ''
    GROUP BY "tutorProfileId", lower(btrim("canonicalSubject"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Skipped SubjectProfile_active_tutor_canonical_uidx: ACTIVE canonical-subject collisions exist. See docs/MTH-TEACHING-PROFILES-PHASE1-PREVIEW.md. Apply after Phase 9 consolidation.';
  ELSE
    EXECUTE $sql$
      CREATE UNIQUE INDEX IF NOT EXISTS "SubjectProfile_active_tutor_canonical_uidx"
      ON "SubjectProfile" ("tutorProfileId", (lower(btrim("canonicalSubject"))))
      WHERE status = 'ACTIVE' AND btrim("canonicalSubject") <> ''
    $sql$;
  END IF;
END $$;
