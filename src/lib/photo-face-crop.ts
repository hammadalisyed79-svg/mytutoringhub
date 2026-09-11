/**
 * Professional headshot framing from a face box.
 * Converts an image-space face rect into PhotoFrameAdjust crop (cover + translate% + scale).
 */

export type FaceBox = {
  /** Left edge in image pixels */
  x: number;
  /** Top edge in image pixels */
  y: number;
  width: number;
  height: number;
};

export type PhotoCrop = {
  x: number;
  y: number;
  zoom: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Under object-fit:cover, zoom=1 fills the frame.
 * Returns zoom that shows the entire image (contain-equivalent).
 */
export function containZoomForCover(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
) {
  if (naturalW <= 0 || naturalH <= 0 || frameW <= 0 || frameH <= 0) return 1;
  const imageAspect = naturalW / naturalH;
  const frameAspect = frameW / frameH;
  const fit = imageAspect > frameAspect ? frameAspect / imageAspect : imageAspect / frameAspect;
  return clamp(fit, 0.35, 1);
}

/** Expand face box to head → shoulders (classic tutor / LinkedIn headshot). */
export function headToShouldersRegion(
  face: FaceBox,
  imageW: number,
  imageH: number,
  frameAspect = 1,
): { x: number; y: number; width: number; height: number } {
  const fh = Math.max(face.height, 1);
  const fw = Math.max(face.width, 1);
  const cx = face.x + fw / 2;
  const cy = face.y + fh / 2;

  // Hair / crown above face; chest / shoulders below.
  const top = face.y - fh * 0.65;
  const bottom = face.y + fh + fh * 1.45;
  let height = bottom - top;
  let width = height * frameAspect;

  // Face should not be tiny in frame — keep horizontal padding around cheeks.
  width = Math.max(width, fw * 2.35);
  height = Math.max(height, width / frameAspect);

  let x = cx - width / 2;
  let y = top + (bottom - top) / 2 - height / 2;
  // Bias upward slightly so crown isn't clipped if we clamp later.
  y -= height * 0.02;

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + width > imageW) x = Math.max(0, imageW - width);
  if (y + height > imageH) y = Math.max(0, imageH - height);
  width = Math.min(width, imageW);
  height = Math.min(height, imageH);

  return { x, y, width, height };
}

/**
 * Map a source crop rectangle to cover+translate+scale used by PhotoFrameAdjust / TutorAvatar.
 * Frame is treated as square for profile photos.
 */
export function regionToCoverCrop(
  region: { x: number; y: number; width: number; height: number },
  imageW: number,
  imageH: number,
  minZoom = 0.35,
  maxZoom = 3,
): PhotoCrop {
  if (imageW <= 0 || imageH <= 0 || region.width <= 0 || region.height <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const rcx = (region.x + region.width / 2) / imageW;
  const rcy = (region.y + region.height / 2) / imageH;

  // Percent shift so region center sits on frame center (origin = center).
  const x = clamp((0.5 - rcx) * 100, -100, 100);
  // Slight upward bias so hair/crown stays inside the circle.
  const y = clamp((0.5 - rcy) * 100 + 4, -100, 100);

  // At zoom=1, cover fills the frame using the image’s shorter side.
  // Zoom so the head→shoulders square fills that view.
  const shortSide = Math.min(imageW, imageH);
  const regionSide = Math.max(region.width, region.height);
  const zoom = clamp(shortSide / Math.max(regionSide, 1), minZoom, maxZoom);

  return { x, y, zoom };
}

export function faceBoxToPhotoCrop(
  face: FaceBox,
  imageW: number,
  imageH: number,
  frameAspect = 1,
): PhotoCrop {
  const region = headToShouldersRegion(face, imageW, imageH, frameAspect);
  return regionToCoverCrop(region, imageW, imageH);
}

/** Fallback when no face is found: upper-body / portrait bias (avoids cutting heads on tall shots). */
export function portraitFallbackCrop(imageW: number, imageH: number): PhotoCrop {
  if (imageW <= 0 || imageH <= 0) return { x: 0, y: 0, zoom: 1 };

  // Prefer the upper portion of tall photos (where faces usually are).
  if (imageH > imageW * 1.15) {
    const side = imageW;
    const region = {
      x: 0,
      y: Math.max(0, imageH * 0.04),
      width: side,
      height: side,
    };
    return regionToCoverCrop(region, imageW, imageH);
  }

  // Wide group-style: center square
  if (imageW > imageH * 1.15) {
    const side = imageH;
    const region = {
      x: (imageW - side) / 2,
      y: 0,
      width: side,
      height: side,
    };
    return regionToCoverCrop(region, imageW, imageH);
  }

  return { x: 0, y: 0, zoom: 1 };
}

type DetectorFace = { boundingBox: { x: number; y: number; width: number; height: number } };

async function detectWithNativeFaceDetector(
  source: HTMLImageElement | ImageBitmap,
): Promise<FaceBox | null> {
  const FaceDetectorCtor = (
    globalThis as unknown as {
      FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
        detect: (input: ImageBitmapSource) => Promise<DetectorFace[]>;
      };
    }
  ).FaceDetector;

  if (!FaceDetectorCtor) return null;

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(source);
    if (!faces?.length) return null;
    // Largest face (main subject)
    const best = faces.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height
        ? a
        : b,
    );
    const b = best.boundingBox;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  } catch {
    return null;
  }
}

/**
 * Detect the primary face and return a head-to-shoulders crop.
 * Uses the browser Face Detector API when available; otherwise portrait fallback.
 */
export async function detectHeadshotCrop(
  img: HTMLImageElement,
  frameAspect = 1,
): Promise<{ crop: PhotoCrop; method: "face" | "portrait_fallback" }> {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return { crop: { x: 0, y: 0, zoom: 1 }, method: "portrait_fallback" };

  const face = await detectWithNativeFaceDetector(img);
  if (face && face.width > 8 && face.height > 8) {
    return { crop: faceBoxToPhotoCrop(face, w, h, frameAspect), method: "face" };
  }

  return { crop: portraitFallbackCrop(w, h), method: "portrait_fallback" };
}
