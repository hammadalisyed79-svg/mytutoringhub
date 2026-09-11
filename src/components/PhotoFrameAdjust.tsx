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
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isIdentityCrop(x: number, y: number, zoom: number) {
  return Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && Math.abs((zoom || 1) - 1) < 0.01;
}

/**
 * Large / tall photos: show the full image first (no auto-cut).
 * User drags to center and scrolls to zoom. Optional face auto-frame is a button only.
 */
export function PhotoFrameAdjust({
  photoUrl,
  cropX,
  cropY,
  cropZoom,
  onChange,
  className,
  emptyLabel = "Add photo",
  borderRadius = "1.2rem",
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cropRef = useRef({ x: cropX, y: cropY, zoom: cropZoom || 1 });
  const naturalRef = useRef({ w: 0, h: 0 });
  const fittedUrl = useRef<string | null>(null);
  const prevCropRef = useRef({ x: cropX, y: cropY, zoom: cropZoom || 1 });
  const [draggingUi, setDraggingUi] = useState(false);
  const [minZoom, setMinZoom] = useState(0.35);
  const [status, setStatus] = useState("");

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

  /** Fit entire photo in the frame (especially important for tall images). */
  const showFullImageCentered = useCallback(() => {
    const frame = frameRef.current;
    const { w, h } = naturalRef.current;
    if (!frame || !w || !h) return;
    const rect = frame.getBoundingClientRect();
    const fit = containZoomForCover(w, h, rect.width, rect.height);
    setMinZoom(fit);
    const next = { x: 0, y: 0, zoom: fit };
    cropRef.current = next;
    onChange(next);
    setStatus(
      h > w * 1.1
        ? "Full tall photo shown — drag to center your face, scroll to zoom in"
        : "Full photo shown — drag to center, scroll to zoom in",
    );
  }, [onChange]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      const isNew = fittedUrl.current !== photoUrl;
      fittedUrl.current = photoUrl || null;
      const frame = frameRef.current;
      if (frame) {
        const rect = frame.getBoundingClientRect();
        setMinZoom(containZoomForCover(img.naturalWidth, img.naturalHeight, rect.width, rect.height));
      }
      // New upload or identity crop → show full image; never auto-cut.
      if (isNew || isIdentityCrop(cropRef.current.x, cropRef.current.y, cropRef.current.zoom || 1)) {
        showFullImageCentered();
      }
    },
    [photoUrl, showFullImageCentered],
  );

  // Reset (0,0,1) → show full image again so user can re-center
  useEffect(() => {
    const prev = prevCropRef.current;
    const nowIdentity = isIdentityCrop(cropX, cropY, cropZoom || 1);
    const wasIdentity = isIdentityCrop(prev.x, prev.y, prev.zoom || 1);
    prevCropRef.current = { x: cropX, y: cropY, zoom: cropZoom || 1 };

    if (!hasPhoto || !photoUrl) return;
    if (!(nowIdentity && !wasIdentity)) return;
    if (!naturalRef.current.w) return;
    fittedUrl.current = null;
    showFullImageCentered();
  }, [cropX, cropY, cropZoom, hasPhoto, photoUrl, showFullImageCentered]);

  useEffect(() => {
    if (!hasPhoto) {
      fittedUrl.current = null;
      setStatus("");
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
    setStatus("Framing face…");
    try {
      const { crop, method } = await detectHeadshotCrop(img, 1);
      cropRef.current = crop;
      onChange(crop);
      setStatus(
        method === "face"
          ? "Face framed — drag to fine-tune center"
          : "Portrait framed — drag to fine-tune center",
      );
    } catch {
      showFullImageCentered();
    }
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
            ? "Profile photo — full image shown. Drag to center, scroll to zoom."
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
              Full photo · Drag to center · Scroll to zoom
            </span>
          </>
        ) : (
          <span className="photo-frame-adjust-empty">{emptyLabel}</span>
        )}
      </div>
      {hasPhoto ? (
        <div className="photo-frame-adjust-toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={showFullImageCentered}>
            Show full photo
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void requestAutoFrame()}>
            Auto-frame face
          </button>
          {status ? <span className="muted photo-frame-adjust-status">{status}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
