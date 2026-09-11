"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PhotoCrop = {
  x: number;
  y: number;
  zoom: number;
};

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

/**
 * Under object-fit:cover, zoom=1 fills the frame (sides/top may be clipped).
 * Returns zoom that shows the entire image inside the frame (contain-equivalent).
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
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cropRef = useRef({ x: cropX, y: cropY, zoom: cropZoom || 1 });
  const naturalRef = useRef({ w: 0, h: 0 });
  const [draggingUi, setDraggingUi] = useState(false);
  const [minZoom, setMinZoom] = useState(0.35);

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

  // New upload / Reset crop sets identity (0,0,1) — switch to full-image fit zoom.
  useEffect(() => {
    if (!hasPhoto || !naturalRef.current.w) return;
    if (!isIdentityCrop(cropX, cropY, cropZoom || 1)) return;
    const fit = updateMinZoomFromNatural();
    if (Math.abs((cropZoom || 1) - fit) > 0.02) {
      onChange({ x: 0, y: 0, zoom: fit });
    }
  }, [hasPhoto, photoUrl, cropX, cropY, cropZoom, onChange, updateMinZoomFromNatural]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      const fit = updateMinZoomFromNatural();
      if (isIdentityCrop(cropRef.current.x, cropRef.current.y, cropRef.current.zoom || 1)) {
        onChange({ x: 0, y: 0, zoom: fit });
      }
    },
    [onChange, updateMinZoomFromNatural],
  );

  useEffect(() => {
    if (!hasPhoto) return;
    const frame = frameRef.current;
    if (!frame) return;
    const ro = new ResizeObserver(() => {
      const fit = updateMinZoomFromNatural();
      if (isIdentityCrop(cropRef.current.x, cropRef.current.y, cropRef.current.zoom || 1)) {
        onChange({ x: 0, y: 0, zoom: fit });
      } else if ((cropRef.current.zoom || 1) < fit) {
        applyCrop({ zoom: fit });
      }
    });
    ro.observe(frame);
    return () => ro.disconnect();
  }, [hasPhoto, photoUrl, onChange, updateMinZoomFromNatural, applyCrop]);

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

  return (
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
          ? "Profile photo — full image shown first. Scroll to zoom in and crop, drag to reposition."
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
            onLoad={onImageLoad}
            style={{
              transform: `translate(${cropX}%, ${cropY}%) scale(${cropZoom || 1})`,
            }}
          />
          <span className="photo-frame-adjust-hint">
            Full photo first · Scroll to zoom in & crop · Drag to move
          </span>
        </>
      ) : (
        <span className="photo-frame-adjust-empty">{emptyLabel}</span>
      )}
    </div>
  );
}
