import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { pauseAllSuspendedTutorPublicSurfaces } from "../src/lib/tutor-suspend-listings.ts";

const prisma = new PrismaClient();

async function main() {
  const before = {
    activeAds: await prisma.tutorAd.count({
      where: { status: "ACTIVE", tutorProfile: { user: { suspended: true } } },
    }),
    activeProfiles: await prisma.subjectProfile.count({
      where: { status: "ACTIVE", tutorProfile: { user: { suspended: true } } },
    }),
  };
  const result = await pauseAllSuspendedTutorPublicSurfaces();
  const after = {
    activeAds: await prisma.tutorAd.count({
      where: { status: "ACTIVE", tutorProfile: { user: { suspended: true } } },
    }),
    activeProfiles: await prisma.subjectProfile.count({
      where: { status: "ACTIVE", tutorProfile: { user: { suspended: true } } },
    }),
  };
  const leftoverAds = await prisma.tutorAd.findMany({
    where: {
      status: "ACTIVE",
      tutorProfile: { user: { suspended: true } },
    },
    select: {
      id: true,
      subject: true,
      status: true,
      tutorProfileId: true,
      tutorProfile: {
        select: {
          userId: true,
          user: { select: { id: true, email: true, role: true, suspended: true } },
        },
      },
    },
  });
  console.log(JSON.stringify({ before, result, after, leftoverAds }, null, 2));
  if (after.activeAds > 0 || after.activeProfiles > 0) {
    // Force-pause any leftovers (role filter may miss suspended non-TUTOR accounts with listings).
    for (const ad of leftoverAds) {
      await prisma.tutorAd.update({ where: { id: ad.id }, data: { status: "PAUSED" } });
    }
    const finalAds = await prisma.tutorAd.count({
      where: { status: "ACTIVE", tutorProfile: { user: { suspended: true } } },
    });
    console.log(JSON.stringify({ forcedPause: leftoverAds.length, finalAds }, null, 2));
    if (finalAds > 0) throw new Error("Suspended tutors still have ACTIVE listings after repair");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
