import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPastPaperFeePkr, parsePastPaperKey } from "@/lib/past-papers";
import { paperHasFile } from "@/lib/past-papers/availability";
import { canDownloadPastPaper, recordUsage } from "@/lib/plan-limits";
import { isSafeCatalogKey } from "@/lib/past-papers/catalog-key";
import {
  createGuestDownloadToken,
  GUEST_PAPER_TOKEN_TTL_MS,
  guestDownloadUrl,
  isValidGuestEmail,
  normalizeGuestEmail,
} from "@/lib/past-papers/guest-checkout";
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
  email: z.string().max(320).optional(),
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

async function startSafepayPaperCheckout(opts: {
  req: Request;
  paper: { id: string; subject: string };
  catalogKey: string;
  listingSubject?: string;
  feePkr: number;
  purchaseData: {
    userId?: string;
    guestEmail?: string;
    downloadToken?: string;
    tokenExpiresAt?: Date;
  };
}) {
  const appUrl = checkoutAppUrl(opts.req);
  if (!safepayConfigured()) {
    return NextResponse.json(
      { error: "Checkout is not configured. Add SAFEPAY_API_KEY and SAFEPAY_SECRET_KEY." },
      { status: 503 },
    );
  }

  const preferred = resolveCurrency(opts.req);
  const currency: CurrencyCode = getSafepayEnv() === "sandbox" ? "PKR" : preferred;
  const amountMajor = pkrToCurrency(opts.feePkr, currency);
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
      redirectUrl: `${appUrl}/api/safepay/complete?kind=paper&key=${encodeURIComponent(opts.catalogKey)}`,
      cancelUrl: `${appUrl}/past-papers?checkout=cancel&subject=${encodeURIComponent(opts.listingSubject || opts.paper.subject)}`,
    });

    await prisma.pastPaperPurchase.create({
      data: {
        paperId: opts.paper.id,
        catalogKey: opts.catalogKey,
        tracker,
        amountPkr: opts.feePkr,
        status: "PENDING",
        ...opts.purchaseData,
      },
    });

    return NextResponse.json({ url, tracker, provider: "safepay", currency, amount });
  } catch (err) {
    console.error("Past paper checkout error", err);
    return NextResponse.json({ error: safepayPublicError(err) }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
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

  const feePkr = await getPastPaperFeePkr();

  if (!session?.user) {
    if (feePkr === 0) {
      return NextResponse.json(
        {
          error: "sign_in_required",
          message: "Free past papers require a free account. Sign in or join to download.",
        },
        { status: 401 },
      );
    }

    const email = normalizeGuestEmail(body.email || "");
    if (!isValidGuestEmail(email)) {
      return NextResponse.json(
        { error: "valid_email_required", message: "Enter a valid email to receive your download link." },
        { status: 400 },
      );
    }

    const existingGuest = await prisma.pastPaperPurchase.findFirst({
      where: { guestEmail: email, catalogKey, status: "PAID", downloadToken: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (existingGuest?.downloadToken) {
      return NextResponse.json({
        url: guestDownloadUrl(catalogKey, existingGuest.downloadToken),
        granted: true,
        guest: true,
      });
    }

    const downloadToken = createGuestDownloadToken();
    return startSafepayPaperCheckout({
      req,
      paper,
      catalogKey,
      listingSubject: listing?.subject,
      feePkr,
      purchaseData: {
        guestEmail: email,
        downloadToken,
        tokenExpiresAt: new Date(Date.now() + GUEST_PAPER_TOKEN_TTL_MS),
      },
    });
  }

  const paid = await prisma.pastPaperPurchase.findFirst({
    where: { userId: session.user.id, catalogKey, status: "PAID" },
  });
  if (paid) {
    return NextResponse.json({ url: `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}` });
  }

  const passDownload = await canDownloadPastPaper(session.user.id);
  if (passDownload.includedInPlan && passDownload.allowed) {
    await prisma.pastPaperPurchase.create({
      data: {
        userId: session.user.id,
        paperId: paper.id,
        catalogKey,
        amountPkr: 0,
        status: "PAID",
      },
    });
    await recordUsage(session.user.id, "paper_download");
    return NextResponse.json({
      url: `/api/past-papers/download?key=${encodeURIComponent(catalogKey)}`,
      granted: true,
      includedInPlan: true,
    });
  }
  if (passDownload.includedInPlan && !passDownload.allowed) {
    return NextResponse.json(
      {
        error: "paper_limit_exceeded",
        message: `You've used all ${passDownload.limit} included past paper downloads this month. Upgrade to Student Pro for unlimited downloads.`,
        upgradeUrl: "/pricing?plan=STUDENT_PRO",
      },
      { status: 429 },
    );
  }

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

  return startSafepayPaperCheckout({
    req,
    paper,
    catalogKey,
    listingSubject: listing?.subject,
    feePkr,
    purchaseData: { userId: session.user.id },
  });
}
