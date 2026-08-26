import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DEFAULT_SITE_URL, SITE_NAME } from "@/lib/seo";

export type PastPaperWatermarkOptions = {
  siteName?: string;
  siteUrl?: string;
};

function displaySiteUrl(raw: string) {
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * Stamps every page with a diagonal site URL and a footer line.
 * Original bytes in storage are unchanged — call at download time only.
 */
export async function watermarkPastPaperPdf(
  input: Uint8Array | Buffer,
  opts: PastPaperWatermarkOptions = {},
) {
  const siteName = opts.siteName ?? SITE_NAME;
  const siteUrl = displaySiteUrl(opts.siteUrl ?? DEFAULT_SITE_URL);
  const diagonalText = siteUrl;
  const footerText = `Downloaded from ${siteName} · ${siteUrl}`;

  const pdfDoc = await PDFDocument.load(input, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const diagonalSize = 24;
  const footerSize = 9;
  const diagonalWidth = font.widthOfTextAtSize(diagonalText, diagonalSize);
  const footerWidth = font.widthOfTextAtSize(footerText, footerSize);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();

    page.drawText(diagonalText, {
      x: width / 2 - diagonalWidth / 2,
      y: height / 2,
      size: diagonalSize,
      font,
      color: rgb(0.72, 0.72, 0.72),
      opacity: 0.2,
      rotate: degrees(-45),
    });

    page.drawText(footerText, {
      x: Math.max(24, (width - footerWidth) / 2),
      y: 18,
      size: footerSize,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.5,
    });
  }

  return Uint8Array.from(await pdfDoc.save());
}
