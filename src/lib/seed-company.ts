import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

  const subjects = [
  ["Mathematics", "mathematics"],
  ["Physics", "physics"],
  ["Chemistry", "chemistry"],
  ["Biology", "biology"],
  ["English", "english"],
  ["Urdu", "urdu"],
  ["Islamiyat", "islamiyat"],
  ["Pakistan Studies", "pakistan-studies"],
  ["Computer Science", "computer-science"],
  ["Accounting", "accounting"],
  ["Economics", "economics"],
  ["IELTS", "ielts"],
  ["Spoken English", "spoken-english"],
  ["CSS Prep", "css-prep"],
  ["O Level Maths", "o-level-maths"],
  ["A Level Physics", "a-level-physics"],
  ["A Level Chemistry", "a-level-chemistry"],
  ["SAT Prep", "sat-prep"],
  ["Spanish", "spanish"],
  ["French", "french"],
  ["Arabic", "arabic"],
  ["Quran Nazra", "quran-nazra"],
  ["Primary School", "primary-school"],
  ["Music Piano", "music-piano"],
  ["Guitar", "guitar"],
] as const;

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

  const adminHash = await hash("admin123456", 10);
  await prisma.user.upsert({
    where: { email: "admin@mytutoringhub.com" },
    update: {
      name: "Site Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
    create: {
      email: "admin@mytutoringhub.com",
      name: "Site Admin",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const tutorHash = await hash("tutor123456", 10);
  const tutor = await prisma.user.upsert({
    where: { email: "tutor@mytutoringhub.com" },
    update: {
      name: "Ali Raza",
      passwordHash: tutorHash,
      role: "TUTOR",
    },
    create: {
      email: "tutor@mytutoringhub.com",
      name: "Ali Raza",
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
      headline: "FSc, O Level & online Maths/Physics — Pakistan & worldwide",
      bio: "I teach Matric, Intermediate (FSc), and O Level Mathematics & Physics with board-focused notes and past papers. Home tuition in Lahore and live online classes for students across Pakistan and abroad (Gulf, UK, etc.).",
      subjects: "Mathematics,Physics,O Level Maths",
      hourlyRate: 2000,
      location: "Lahore / Online (Worldwide)",
      online: true,
      inPerson: true,
    },
    create: {
      userId: tutor.id,
      headline: "FSc, O Level & online Maths/Physics — Pakistan & worldwide",
      bio: "I teach Matric, Intermediate (FSc), and O Level Mathematics & Physics with board-focused notes and past papers. Home tuition in Lahore and live online classes for students across Pakistan and abroad (Gulf, UK, etc.).",
      subjects: "Mathematics,Physics,O Level Maths",
      hourlyRate: 2000,
      location: "Lahore / Online (Worldwide)",
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
    update: {
      name: "Ayesha Khan",
      passwordHash: studentHash,
      role: "STUDENT",
    },
    create: {
      email: "student@mytutoringhub.com",
      name: "Ayesha Khan",
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

  return COMPANY_ACCOUNTS.map(({ email, password, role, name }) => ({
    email,
    password,
    role,
    name,
  }));
}
