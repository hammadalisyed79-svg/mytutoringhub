import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TUTOR"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase();
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
      },
    });

    if (data.role === "TUTOR") {
      await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          bio: "New tutor — update your profile in the dashboard.",
          subjects: "",
          hourlyRate: 25,
          location: "",
          online: true,
          inPerson: false,
          active: false,
        },
      });
    }

    await sendEmail({
      to: email,
      subject: "Welcome to MyTutoringHub",
      html: welcomeEmailHtml(data.name, data.role),
    });

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
