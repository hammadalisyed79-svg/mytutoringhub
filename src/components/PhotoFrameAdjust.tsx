"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PhotoCrop } from "@/lib/photo-face-crop";
import { detectHeadshotCrop } from "@/lib/photo-face-crop";

export type { PhotoCrop };

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
 * Google-style profile photo adjuster:
 * - Full photo visible first (object-fit: contain, zoom = 1)
 * - Drag to center
 * - Slider / scroll to zoom
 * Same contain + translate + scale model as TutorAvatar.
 */
export function PhotoFrameAdjust({
  photoUrl,
  cropX,
  cropY,
  cropZoom,
  onChange,
  className,
  emptyLabel = "Add photo",
  borderRadius = "50%",
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const cropRef = useRef({ x: cropX, y: cropY, zoom: cropZoom || 1 });
  const prevPhotoUrl = useRef<string | undefined>(undefined);
  const [draggingUi, setDraggingUi] = useState(false);
  const [status, setStatus] = useState("");
  const zoomId = useId();

  const hasPhoto = Boolean(photoUrl?.startsWith("http"));
  const zoom = clamp(cropZoom || 1, 1, 3);

  useEffect(() => {
    cropRef.current = { x: cropX, y: cropY, zoom: clamp(cropZoom || 1, 1, 3) };
  }, [cropX, cropY, cropZoom]);

  const applyCrop = useCallback(
    (patch: Partial<PhotoCrop>) => {
      const next = {
        x: clamp(patch.x ?? cropRef.current.x, -100, 100),
        y: clamp(patch.y ?? cropRef.current.y, -100, 100),
        zoom: clamp(patch.zoom ?? cropRef.current.zoom, 1, 3),
      };
      cropRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  /** Full photo, centered — like opening Google’s photo picker. */
  const resetToFullPhoto = useCallback(() => {
    const next = { x: 0, y: 0, zoom: 1 };
    cropRef.current = next;
    onChange(next);
    setStatus("Full photo — drag to center your face, then zoom in");
  }, [onChange]);

  // Reset framing only when the photo URL changes (new upload), not when reopening saved crop.
  useEffect(() => {
    if (!photoUrl?.startsWith("http")) {
      prevPhotoUrl.current = undefined;
      setStatus("");
      return;
    }
    if (prevPhotoUrl.current && prevPhotoUrl.current !== photoUrl) {
      resetToFullPhoto();
    }
    prevPhotoUrl.current = photoUrl;
  }, [photoUrl, resetToFullPhoto]);

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
      // Move image with the finger/cursor (Google-style).
      const dx = ((e.clientX - lastPos.current.x) / rect.width) * 100;
      const dy = ((e.clientY - lastPos.current.y) / rect.height) * 100;
      lastPos.current = { x: e.clientX, y: e.clientY };
      const z = cropRef.current.zoom || 1;
      applyCrop({
        x: cropRef.current.x + dx / z,
        y: cropRef.current.y + dy / z,
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
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
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
      // Face crop helper assumes cover; map to contain-ish zoom by keeping pan and using max(1, zoom*0.85)
      const next = {
        x: crop.x,
        y: crop.y,
        zoom: clamp(Math.max(1.15, crop.zoom * 0.9), 1, 3),
      };
      cropRef.current = next;
      onChange(next);
      setStatus(
        method === "face"
          ? "Face centered — drag or zoom to adjust"
          : "Portrait framed — drag or zoom to adjust",
      );
    } catch {
      resetToFullPhoto();
    }
  }

  return (
    <div className="photo-frame-adjust-wrap">
      <div
        ref={frameRef}
        className={`photo-frame-adjust photo-frame-adjust--google${draggingUi ? " is-dragging" : ""}${hasPhoto ? " has-photo" : ""}${className ? ` ${className}` : ""}`}
        style={{ borderRadius }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role={hasPhoto ? "img" : undefined}
        aria-label={
          hasPhoto ? "Profile photo. Drag to center. Use the slider to zoom." : undefined
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
              style={{
                transform: `translate(${cropX}%, ${cropY}%) scale(${zoom})`,
              }}
            />
            <span className="photo-frame-adjust-mask" aria-hidden="true" />
            <span className="photo-frame-adjust-hint">Drag photo to center</span>
          </>
        ) : (
          <span className="photo-frame-adjust-empty">{emptyLabel}</span>
        )}
      </div>

      {hasPhoto ? (
        <div className="photo-frame-adjust-controls">
          <label className="photo-frame-zoom" htmlFor={zoomId}>
            <span>Zoom</span>
            <input
              id={zoomId}
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => applyCrop({ zoom: Number(e.target.value) })}
            />
            <span className="photo-frame-zoom-val">{zoom.toFixed(1)}×</span>
          </label>
          <div className="photo-frame-adjust-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetToFullPhoto}>
              Show full photo
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void requestAutoFrame()}
            >
              Center on face
            </button>
          </div>
          {status ? <p className="muted photo-frame-adjust-status">{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
