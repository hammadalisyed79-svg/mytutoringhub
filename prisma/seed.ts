import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const subjects = [
  ["Mathematics", "mathematics"],
  ["English", "english"],
  ["Physics", "physics"],
  ["Chemistry", "chemistry"],
  ["Biology", "biology"],
  ["Spanish", "spanish"],
  ["French", "french"],
  ["Computer Science", "computer-science"],
  ["Music Piano", "music-piano"],
  ["SAT Prep", "sat-prep"],
  ["Primary School", "primary-school"],
  ["Guitar", "guitar"],
];

async function main() {
  for (const [name, slug] of subjects) {
    await prisma.subject.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }

  const passwordHash = await hash("admin123456", 10);
  await prisma.user.upsert({
    where: { email: "admin@mytutoringhub.com" },
    update: {},
    create: {
      email: "admin@mytutoringhub.com",
      name: "Site Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  const tutorHash = await hash("tutor123456", 10);
  const tutor = await prisma.user.upsert({
    where: { email: "tutor@mytutoringhub.com" },
    update: {},
    create: {
      email: "tutor@mytutoringhub.com",
      name: "Alex Rivera",
      passwordHash: tutorHash,
      role: "TUTOR",
    },
  });

  await prisma.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: {
      verified: true,
      highlighted: true,
      active: true,
    },
    create: {
      userId: tutor.id,
      headline: "Patient Maths & Physics tutor",
      bio: "I help secondary and college students build confidence in STEM. Online or in-person sessions available.",
      subjects: "Mathematics,Physics,SAT Prep",
      hourlyRate: 35,
      location: "Austin, TX",
      online: true,
      inPerson: true,
      verified: true,
      highlighted: true,
      active: true,
    },
  });

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
    update: {},
    create: {
      email: "student@mytutoringhub.com",
      name: "Jamie Chen",
      passwordHash: studentHash,
      role: "STUDENT",
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
    where: { userId: student.id, title: "Looking for GCSE-level Maths help" },
  });
  if (!existingAd) {
    await prisma.studentAd.create({
      data: {
        userId: student.id,
        title: "Looking for GCSE-level Maths help",
        subject: "Mathematics",
        level: "Secondary",
        location: "Online",
        description: "Need weekly support with algebra and exam technique. Prefer evenings.",
        budget: 30,
        online: true,
        inPerson: false,
        status: "OPEN",
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin: admin@mytutoringhub.com / admin123456");
  console.log("Tutor: tutor@mytutoringhub.com / tutor123456");
  console.log("Student: student@mytutoringhub.com / student123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
