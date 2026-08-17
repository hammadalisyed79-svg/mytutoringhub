import { NextResponse } from "next/server";
import { seedCompanyData, COMPANY_ACCOUNTS } from "@/lib/seed-company";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET || process.env.AUTH_SECRET;
  const header = req.headers.get("x-seed-secret");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (!secret || (header !== secret && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await seedCompanyData();
    return NextResponse.json({
      ok: true,
      message: "Company accounts ready",
      accounts: accounts.map((a) => ({
        role: a.role,
        email: a.email,
        password: a.password,
        name: a.name,
      })),
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
