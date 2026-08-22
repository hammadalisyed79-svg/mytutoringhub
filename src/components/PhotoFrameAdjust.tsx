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
  const [draggingUi, setDraggingUi] = useState(false);

  const hasPhoto = Boolean(photoUrl?.startsWith("http"));

  const applyCrop = useCallback(
    (patch: Partial<PhotoCrop>) => {
      onChange({
        x: patch.x ?? cropX,
        y: patch.y ?? cropY,
        zoom: patch.zoom ?? cropZoom,
      });
    },
    [cropX, cropY, cropZoom, onChange],
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
      const zoom = cropZoom || 1;
      applyCrop({
        x: clamp(cropX + dx / zoom, -100, 100),
        y: clamp(cropY + dy / zoom, -100, 100),
      });
    },
    [applyCrop, cropX, cropY, cropZoom, hasPhoto],
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
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      applyCrop({ zoom: clamp((cropZoom || 1) + delta, 1, 3) });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [applyCrop, cropZoom, hasPhoto]);

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
