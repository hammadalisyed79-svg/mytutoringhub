"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CropState = {
  x: number; // percent offset (-100 to 100)
  y: number;
  zoom: number; // 1.0 = no zoom
};

type Props = {
  photoUrl: string;
  initial?: CropState;
  onSave: (crop: CropState) => void;
  onCancel: () => void;
};

const PREVIEW_SIZE = 200; // px for the circular preview

export function PhotoCropEditor({ photoUrl, initial, onSave, onCancel }: Props) {
  const [crop, setCrop] = useState<CropState>(initial ?? { x: 0, y: 0, zoom: 1 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - lastPos.current.x) / rect.width) * 100;
      const dy = ((e.clientY - lastPos.current.y) / rect.height) * 100;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setCrop((c) => ({
        ...c,
        x: clamp(c.x + dx / c.zoom, -100, 100),
        y: clamp(c.y + dy / c.zoom, -100, 100),
      }));
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  return (
    <div className="crop-editor">
      <p className="field-hint">Drag to reposition · Use the slider to zoom</p>

      <div
        ref={containerRef}
        className="crop-editor-canvas"
        style={{
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          cursor: "grab",
          border: "2px solid var(--border, #ddd)",
          userSelect: "none",
          touchAction: "none",
          margin: "0 auto",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`,
            transformOrigin: "center center",
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        />
      </div>

      <label className="crop-zoom-label" style={{ display: "block", marginTop: "0.75rem" }}>
        <span className="field-hint">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={crop.zoom}
          onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
          style={{ width: "100%" }}
        />
      </label>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "center" }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onSave(crop)}
        >
          Apply crop
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setCrop({ x: 0, y: 0, zoom: 1 })}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
