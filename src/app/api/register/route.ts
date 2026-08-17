import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/email-verification";
import { getSiteSettings } from "@/lib/site-settings";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().min(5).max(254),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TUTOR"]),
});

export async function POST(req: Request) {
  try {
    const settings = await getSiteSettings();
    if (settings.disableSignups) {
      return NextResponse.json({ error: "New registrations are temporarily closed" }, { status: 403 });
    }
    const body = await req.json();
    const data = schema.parse(body);
    const email = normalizeEmail(data.email);
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email such as Gmail, Hotmail, Outlook, or Yahoo." },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }
    const passwordHash = await hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash,
        role: data.role,
        emailVerified: null,
      },
    });

    if (data.role === "TUTOR") {
      await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          bio: "New tutor — update your profile in the dashboard.",
          subjects: "",
          hourlyRate: 1500,
          location: "Online",
          online: true,
          inPerson: false,
          active: false,
        },
      });
    }

    await issueEmailVerification({ id: user.id, name: user.name, email: user.email });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error("Registration failed:", e);
    const message = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ error: "Registration failed", detail: message }, { status: 500 });
  }
}
