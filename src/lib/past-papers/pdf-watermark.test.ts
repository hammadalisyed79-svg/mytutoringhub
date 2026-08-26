import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { watermarkPastPaperPdf } from "./pdf-watermark";

async function makeSinglePagePdf(text: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 40, y: 160, size: 14, font });
  return doc.save();
}

async function run() {
  const original = await makeSinglePagePdf("Sample exam paper content");
  const stamped = await watermarkPastPaperPdf(original, {
    siteName: "My Tutoring Hub",
    siteUrl: "https://www.mytutoringhub.com",
  });

  assert.ok(stamped.byteLength > original.byteLength, "watermarked PDF should be larger");

  const parsed = await PDFDocument.load(stamped);
  assert.equal(parsed.getPageCount(), 1, "page count unchanged");

  console.log("pdf-watermark tests passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
