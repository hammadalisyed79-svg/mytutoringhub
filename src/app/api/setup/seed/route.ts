import { NextResponse } from "next/server";
import { seedCompanyData } from "@/lib/seed-company";

export const runtime = "nodejs";

function isProductionEnv() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export async function POST(req: Request) {
  if (isProductionEnv()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const seedSecret = process.env.SEED_SECRET?.trim();
  if (!seedSecret) {
    return NextResponse.json(
      { error: "SEED_SECRET is not configured for this environment." },
      { status: 503 },
    );
  }

  const header = req.headers.get("x-seed-secret");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (header !== seedSecret && querySecret !== seedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await seedCompanyData();
    return NextResponse.json({
      ok: true,
      message: "Company accounts ready (development only)",
      accountCount: accounts.length,
      emails: accounts.map((a) => ({ role: a.role, email: a.email, name: a.name })),
    });
  } catch (e) {
    console.error("Seed failed", e);
    return NextResponse.json(
      { error: "Seed failed", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
