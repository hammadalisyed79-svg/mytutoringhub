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
  const [draggingUi, setDraggingUi] = useState(false);

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
      cropRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!hasPhoto) return;
    e.preventDefault();
    dragging.current = true;
    setDraggingUi(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    frameRef.current?.setPointerCapture(e.pointerId);
  }, [hasPhoto]);

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
        x: clamp(cropRef.current.x + dx / zoom, -100, 100),
        y: clamp(cropRef.current.y + dy / zoom, -100, 100),
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
      applyCrop({ zoom: clamp((cropRef.current.zoom || 1) + delta, 1, 3) });
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
      aria-label={hasPhoto ? "Profile photo — drag to reposition, scroll to zoom" : undefined}
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
              transform: `translate(${cropX}%, ${cropY}%) scale(${cropZoom || 1})`,
            }}
          />
          <span className="photo-frame-adjust-hint">Drag · Scroll to zoom</span>
        </>
      ) : (
        <span className="photo-frame-adjust-empty">{emptyLabel}</span>
      )}
    </div>
  );
}
