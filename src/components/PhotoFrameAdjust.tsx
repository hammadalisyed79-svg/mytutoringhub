"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  containZoomForCover,
  detectHeadshotCrop,
  type PhotoCrop,
} from "@/lib/photo-face-crop";

export type { PhotoCrop };
export { containZoomForCover };

type Props = {
  photoUrl?: string;
  cropX: number;
  cropY: number;
  cropZoom: number;
  onChange: (crop: PhotoCrop) => void;
  className?: string;
  emptyLabel?: string;
  borderRadius?: string;
  /** When true (default), new/reset photos auto-frame head→shoulders via face detection. */
  autoFaceCrop?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isIdentityCrop(x: number, y: number, zoom: number) {
  return Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && Math.abs((zoom || 1) - 1) < 0.01;
}

export function PhotoFrameAdjust({
  photoUrl,
  cropX,
  cropY,
  cropZoom,
  onChange,
  className,
  emptyLabel = "Add photo",
  borderRadius = "1.2rem",
  autoFaceCrop = true,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cropRef = useRef({ x: cropX, y: cropY, zoom: cropZoom || 1 });
  const naturalRef = useRef({ w: 0, h: 0 });
  const facedUrl = useRef<string | null>(null);
  const prevCropRef = useRef({ x: cropX, y: cropY, zoom: cropZoom || 1 });
  const [draggingUi, setDraggingUi] = useState(false);
  const [minZoom, setMinZoom] = useState(0.35);
  const [faceStatus, setFaceStatus] = useState<string>("");

  useEffect(() => {
    cropRef.current = { x: cropX, y: cropY, zoom: cropZoom || 1 };
  }, [cropX, cropY, cropZoom]);

  const hasPhoto = Boolean(photoUrl?.startsWith("http"));

  const applyCrop = useCallback(
    (patch: Partial<PhotoCrop>) => {
      const next = {
        x: patch.x ?? cropRef.current.x,
        y: patch.y ?? cropRef.current.y,
        zoom: patch.zoom ?? cropRef.current.zoom,
      };
      next.zoom = clamp(next.zoom, minZoom, 3);
      next.x = clamp(next.x, -100, 100);
      next.y = clamp(next.y, -100, 100);
      cropRef.current = next;
      onChange(next);
    },
    [onChange, minZoom],
  );

  const updateMinZoomFromNatural = useCallback(() => {
    const frame = frameRef.current;
    const { w, h } = naturalRef.current;
    if (!frame || !w || !h) return 1;
    const rect = frame.getBoundingClientRect();
    const fit = containZoomForCover(w, h, rect.width, rect.height);
    setMinZoom(fit);
    return fit;
  }, []);

  const runFaceFraming = useCallback(
    async (img: HTMLImageElement, force: boolean) => {
      if (!autoFaceCrop) return;
      if (!force && facedUrl.current === photoUrl) return;
      if (!force && !isIdentityCrop(cropRef.current.x, cropRef.current.y, cropRef.current.zoom || 1)) {
        return;
      }

      setFaceStatus("Framing face…");
      try {
        const { crop, method } = await detectHeadshotCrop(img, 1);
        facedUrl.current = photoUrl || null;
        cropRef.current = crop;
        onChange(crop);
        setFaceStatus(
          method === "face"
            ? "Auto-framed head to shoulders — drag or scroll to fine-tune"
            : "Portrait framed (no face API) — drag or scroll to fine-tune",
        );
      } catch {
        const fit = updateMinZoomFromNatural();
        onChange({ x: 0, y: 0, zoom: Math.max(fit, 1) });
        setFaceStatus("Adjust crop manually — scroll to zoom, drag to move");
      }
    },
    [autoFaceCrop, onChange, photoUrl, updateMinZoomFromNatural],
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      updateMinZoomFromNatural();
      void runFaceFraming(img, facedUrl.current !== photoUrl);
    },
    [photoUrl, runFaceFraming, updateMinZoomFromNatural],
  );

  // Reset crop (0,0,1) after a non-default crop → re-run face framing
  useEffect(() => {
    const prev = prevCropRef.current;
    const nowIdentity = isIdentityCrop(cropX, cropY, cropZoom || 1);
    const wasIdentity = isIdentityCrop(prev.x, prev.y, prev.zoom || 1);
    prevCropRef.current = { x: cropX, y: cropY, zoom: cropZoom || 1 };

    if (!hasPhoto || !photoUrl) return;
    if (!(nowIdentity && !wasIdentity)) return;

    facedUrl.current = null;
    const img = frameRef.current?.querySelector("img");
    if (img && img.naturalWidth) {
      void runFaceFraming(img, true);
    }
  }, [cropX, cropY, cropZoom, hasPhoto, photoUrl, runFaceFraming]);

  useEffect(() => {
    if (!hasPhoto) {
      facedUrl.current = null;
      setFaceStatus("");
    }
  }, [hasPhoto, photoUrl]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!hasPhoto) return;
      e.preventDefault();
      dragging.current = true;
      setDraggingUi(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
      frameRef.current?.setPointerCapture(e.pointerId);
    },
    [hasPhoto],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !frameRef.current || !hasPhoto) return;
      e.preventDefault();
      const rect = frameRef.current.getBoundingClientRect();
      const dx = ((e.clientX - lastPos.current.x) / rect.width) * 100;
      const dy = ((e.clientY - lastPos.current.y) / rect.height) * 100;
      lastPos.current = { x: e.clientX, y: e.clientY };
      const zoom = cropRef.current.zoom || 1;
      applyCrop({
        x: cropRef.current.x + dx / zoom,
        y: cropRef.current.y + dy / zoom,
      });
    },
    [applyCrop, hasPhoto],
  );

  const endDrag = useCallback(() => {
    dragging.current = false;
    setDraggingUi(false);
  }, []);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || !hasPhoto) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      applyCrop({ zoom: (cropRef.current.zoom || 1) + delta });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [applyCrop, hasPhoto]);

  async function requestAutoFrame() {
    const img = frameRef.current?.querySelector("img");
    if (!img || !img.naturalWidth) return;
    facedUrl.current = null;
    await runFaceFraming(img, true);
  }

  return (
    <div className="photo-frame-adjust-wrap">
      <div
        ref={frameRef}
        className={`photo-frame-adjust${draggingUi ? " is-dragging" : ""}${hasPhoto ? " has-photo" : ""}${className ? ` ${className}` : ""}`}
        style={{ borderRadius }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role={hasPhoto ? "img" : undefined}
        aria-label={
          hasPhoto
            ? "Profile photo — auto head-to-shoulders framing. Scroll to zoom, drag to reposition."
            : undefined
        }
      >
        {hasPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt=""
              draggable={false}
              className="photo-frame-adjust-image"
              crossOrigin="anonymous"
              onLoad={onImageLoad}
              style={{
                transform: `translate(${cropX}%, ${cropY}%) scale(${cropZoom || 1})`,
              }}
            />
            <span className="photo-frame-adjust-hint">
              Head → shoulders auto-frame · Scroll zoom · Drag move
            </span>
          </>
        ) : (
          <span className="photo-frame-adjust-empty">{emptyLabel}</span>
        )}
      </div>
      {hasPhoto ? (
        <div className="photo-frame-adjust-toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void requestAutoFrame()}>
            Auto-frame face
          </button>
          {faceStatus ? <span className="muted photo-frame-adjust-status">{faceStatus}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
