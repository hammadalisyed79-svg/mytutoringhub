import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPastPaperFeePkr, parsePastPaperKey } from "@/lib/past-papers";
import { paperHasFile } from "@/lib/past-papers/availability";
import { isSafeCatalogKey } from "@/lib/past-papers/catalog-key";
import {
  checkoutCurrency,
  currencyFromAcceptLanguage,
  currencyFromCountry,
  pkrToCurrency,
  toSafepayMinorUnits,
  type CurrencyCode,
} from "@/lib/currency";
import {
  checkoutAppUrl,
  createSafepayHostedCheckout,
  getSafepayEnv,
  safepayConfigured,
  safepayPublicError,
} from "@/lib/safepay";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  catalogKey: z.string().min(4).max(200),
  currency: z.string().optional(),
});

function resolveCurrency(req: Request, bodyCurrency?: string): CurrencyCode {
  if (bodyCurrency && bodyCurrency.length === 3) {
    return checkoutCurrency(bodyCurrency.toUpperCase() as CurrencyCode);
  }
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code");
  if (country && country !== "XX" && country !== "T1") {
    return checkoutCurrency(currencyFromCountry(country));
  }
  return checkoutCurrency(currencyFromAcceptLanguage(req.headers.get("accept-language")));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to download past papers" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  if (!isSafeCatalogKey(body.catalogKey)) {
    return NextResponse.json({ error: "Unknown past paper" }, { status: 404 });
  }
  const listing = parsePastPaperKey(body.catalogKey);
  const catalogKey = listing?.key || body.catalogKey;

  const paper = await prisma.pastPaper.findUnique({ where: { catalogKey } });
  if (!paper || !paperHasFile(paper) || !paper.published || paper.isActive === false) {
    return NextResponse.json({ error: "This paper is not available for download yet" }, { status: 404 });
  }

  const paid = await prisma.pastPaperPurchase.findFirst({
    where: { userId: session.user.id, catalogKey, status: "PAID" },
  });
  if (paid) {
    return NextResponse.json({ url: `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}` });
  }

  const feePkr = await getPastPaperFeePkr();
  const appUrl = checkoutAppUrl(req);

  if (feePkr === 0 || session.user.role === "ADMIN") {
    await prisma.pastPaperPurchase.create({
      data: {
        userId: session.user.id,
        paperId: paper.id,
        catalogKey,
        amountPkr: 0,
        status: "PAID",
      },
    });
    return NextResponse.json({
      url: `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}`,
      granted: true,
    });
  }

  if (!safepayConfigured()) {
    return NextResponse.json(
      { error: "Checkout is not configured. Add SAFEPAY_API_KEY and SAFEPAY_SECRET_KEY." },
      { status: 503 },
    );
  }

  const preferred = resolveCurrency(req, body.currency);
  const currency: CurrencyCode = getSafepayEnv() === "sandbox" ? "PKR" : preferred;
  const amountMajor = pkrToCurrency(feePkr, currency);
  const amount = toSafepayMinorUnits(amountMajor, currency);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid checkout amount" }, { status: 400 });
  }
  const orderId = `mth_paper_${Date.now()}`;

  try {
    const { url, tracker } = await createSafepayHostedCheckout({
      amount,
      currency,
      orderId,
      redirectUrl: `${appUrl}/api/safepay/complete?kind=paper&key=${encodeURIComponent(catalogKey)}`,
      cancelUrl: `${appUrl}/past-papers?checkout=cancel&subject=${encodeURIComponent(listing?.subject || paper.subject)}`,
    });

    await prisma.pastPaperPurchase.create({
      data: {
        userId: session.user.id,
        paperId: paper.id,
        catalogKey,
        tracker,
        amountPkr: feePkr,
        status: "PENDING",
      },
    });

    return NextResponse.json({ url, tracker, provider: "safepay", currency, amount });
  } catch (err) {
    console.error("Past paper checkout error", err);
    return NextResponse.json({ error: safepayPublicError(err) }, { status: 502 });
  }
}
