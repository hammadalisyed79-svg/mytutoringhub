import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailVerification } from "@/lib/email-verification";
import { attributeReferralOnSignup } from "@/lib/hub-points";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { getSiteSettings } from "@/lib/site-settings";
import { isValidEmail, normalizeEmail } from "@/lib/email-address";
import { normalizeDisplayName } from "@/lib/display-name";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().min(5).max(254),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TUTOR"]),
  ref: z.string().optional(),
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
    const name = normalizeDisplayName(data.name);
    if (!name) {
      return NextResponse.json({ error: "Enter a name between 2 and 80 characters" }, { status: 400 });
    }
    const passwordHash = await hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name,
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

    void sendEmail({
      to: user.email,
      subject: "Welcome to My Tutoring Hub",
      html: welcomeEmailHtml(user.name, user.role),
    }).catch((err) => console.error("[register] welcome email failed", err));

    if (data.ref?.trim()) {
      try {
        await attributeReferralOnSignup(user.id, data.ref.trim());
      } catch {
        // Referral is best-effort — signup still succeeds
      }
    }

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
