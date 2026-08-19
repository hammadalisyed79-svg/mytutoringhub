import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { catalogSubjectNames } from "@/lib/subject-catalog";
import { slugify } from "@/lib/search-tutors";

const subjects = catalogSubjectNames().map((name) => [name, slugify(name)] as const);

export const COMPANY_ACCOUNTS = [
  {
    role: "ADMIN" as const,
    email: "admin@mytutoringhub.com",
    password: "admin123456",
    name: "Site Admin",
  },
  {
    role: "TUTOR" as const,
    email: "tutor@mytutoringhub.com",
    password: "tutor123456",
    name: "Ali Raza",
  },
  {
    role: "STUDENT" as const,
    email: "student@mytutoringhub.com",
    password: "student123456",
    name: "Ayesha Khan",
  },
];

export async function seedCompanyData() {
  for (const [name, slug] of subjects) {
    await prisma.subject.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  const now = new Date();
  const adminHash = await hash("admin123456", 10);
  await prisma.user.upsert({
    where: { email: "admin@mytutoringhub.com" },
    update: {
      name: "Site Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: now,
    },
    create: {
      email: "admin@mytutoringhub.com",
      name: "Site Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      emailVerified: now,
    },
  });

  const tutorHash = await hash("tutor123456", 10);
  const tutor = await prisma.user.upsert({
    where: { email: "tutor@mytutoringhub.com" },
    update: {
      name: "Ali Raza",
      passwordHash: tutorHash,
      role: "TUTOR",
      emailVerified: now,
    },
    create: {
      email: "tutor@mytutoringhub.com",
      name: "Ali Raza",
      passwordHash: tutorHash,
      role: "TUTOR",
      emailVerified: now,
    },
  });

  await prisma.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: {
      verified: true,
      highlighted: true,
      highlightedUntil: new Date(Date.now() + 30 * 86400000),
      active: true,
      headline: "FSc, O Level & online Maths/Physics",
      bio: "I teach Matric, Intermediate (FSc), and O Level Mathematics & Physics with board-focused notes and past papers. Home tuition in Lahore and live online classes for students worldwide.",
      subjects: "Mathematics,Physics,O Level Maths",
      hourlyRate: 2000,
      location: "Lahore / Online",
      online: true,
      inPerson: true,
      levels: "Secondary, Intermediate, O Level",
      languages: "English, Urdu",
      qualifications: "MSc Physics; 8+ years tutoring",
      teachingMethod: "Past papers, weekly tests, concept drills",
      availability: "Weekday evenings and weekends",
      offersFreeTrial: true,
    },
    create: {
      userId: tutor.id,
      headline: "FSc, O Level & online Maths/Physics",
      bio: "I teach Matric, Intermediate (FSc), and O Level Mathematics & Physics with board-focused notes and past papers. Home tuition in Lahore and live online classes for students worldwide.",
      subjects: "Mathematics,Physics,O Level Maths",
      hourlyRate: 2000,
      location: "Lahore / Online",
      online: true,
      inPerson: true,
      levels: "Secondary, Intermediate, O Level",
      languages: "English, Urdu",
      qualifications: "MSc Physics; 8+ years tutoring",
      teachingMethod: "Past papers, weekly tests, concept drills",
      availability: "Weekday evenings and weekends",
      offersFreeTrial: true,
      verified: true,
      highlighted: true,
      highlightedUntil: new Date(Date.now() + 30 * 86400000),
      active: true,
    },
  });

  const tutorProfile = await prisma.tutorProfile.findUniqueOrThrow({ where: { userId: tutor.id } });
  const existingAds = await prisma.tutorAd.count({ where: { tutorProfileId: tutorProfile.id } });
  if (existingAds === 0) {
    for (const subject of ["Mathematics", "Physics", "O Level Maths"]) {
      await prisma.tutorAd.create({
        data: {
          tutorProfileId: tutorProfile.id,
          subject,
          title: `${subject} private lessons`,
          level: "Secondary / O Level",
          location: "Lahore / Online",
          online: true,
          inPerson: true,
          rate: 2000,
          description: `Board-focused ${subject} tutoring with past papers.`,
          status: "ACTIVE",
          highlightedUntil: new Date(Date.now() + 30 * 86400000),
        },
      });
    }
  }

  for (const [id, plan] of [
    ["seed_tutor_basic", "TUTOR_BASIC"],
    ["seed_tutor_verified", "VERIFIED_TUTOR"],
    ["seed_tutor_highlight", "HIGHLIGHTED_AD"],
  ] as const) {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: id },
      update: { status: "ACTIVE" },
      create: {
        userId: tutor.id,
        plan,
        status: "ACTIVE",
        stripeSubscriptionId: id,
        currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      },
    });
  }

  const studentHash = await hash("student123456", 10);
  const student = await prisma.user.upsert({
    where: { email: "student@mytutoringhub.com" },
    update: {
      name: "Ayesha Khan",
      passwordHash: studentHash,
      role: "STUDENT",
      emailVerified: now,
    },
    create: {
      email: "student@mytutoringhub.com",
      name: "Ayesha Khan",
      passwordHash: studentHash,
      role: "STUDENT",
      emailVerified: now,
    },
  });

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: "seed_student_pass" },
    update: { status: "ACTIVE" },
    create: {
      userId: student.id,
      plan: "STUDENT_PASS",
      status: "ACTIVE",
      stripeSubscriptionId: "seed_student_pass",
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  const existingAd = await prisma.studentAd.findFirst({
    where: { userId: student.id, title: "Looking for FSc Chemistry tutor (Karachi)" },
  });
  if (!existingAd) {
    await prisma.studentAd.create({
      data: {
        userId: student.id,
        title: "Looking for FSc Chemistry tutor (Karachi)",
        subject: "Chemistry",
        level: "Intermediate / FSc",
        location: "Karachi",
        description:
          "Need weekly support for 1st year FSc Chemistry (Sindh Board). Prefer evenings, home tuition in Gulshan or online Zoom.",
        budget: 1800,
        online: true,
        inPerson: true,
        status: "OPEN",
      },
    });
  }

  // Migrate legacy profiles: one default TutorAd per subject when none exist.
  const profilesNeedingAds = await prisma.tutorProfile.findMany({
    where: { ads: { none: {} } },
  });
  for (const profile of profilesNeedingAds) {
    const subjectList = profile.subjects
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const unique = [...new Set(subjectList.length ? subjectList : ["General"])];
    for (const subject of unique.slice(0, 3)) {
      await prisma.tutorAd.create({
        data: {
          tutorProfileId: profile.id,
          subject,
          title: `${subject} private lessons`,
          level: profile.levels || "All levels",
          location: profile.location,
          online: profile.online,
          inPerson: profile.inPerson,
          rate: profile.hourlyRate,
          description: profile.headline || profile.bio.slice(0, 280),
          status: "ACTIVE",
          highlightedUntil: profile.highlightedUntil,
          boostUntil: profile.boostUntil,
        },
      });
    }
  }

  // Existing accounts created before email verification: keep them usable.
  // New signups have a pending token, so they stay unverified until they click the link.
  await prisma.user.updateMany({
    where: {
      emailVerified: null,
      emailVerificationTokens: { none: {} },
    },
    data: { emailVerified: now },
  });

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return COMPANY_ACCOUNTS.map(({ email, password, role, name }) => ({
    email,
    password,
    role,
    name,
  }));
}
