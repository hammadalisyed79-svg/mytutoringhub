import { ImageResponse } from "next/og";
import { BrandMarkOg } from "@/lib/brand-mark-og";
import { VALUE_PROPOSITION_SHORT } from "@/lib/marketing-copy";

export const runtime = "edge";
export const alt = "My Tutoring Hub — Find tutors free. Pay only for messaging access.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(145deg, #062e28 0%, #0a4d42 42%, #0d5f52 100%)",
          color: "#fffbf7",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <BrandMarkOg size={72} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: 0.82,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 600,
              }}
            >
              My Tutoring Hub
            </span>
            <span style={{ fontSize: 28, opacity: 0.72, fontFamily: "system-ui, sans-serif" }}>
              World-class tutoring marketplace
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 980 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            Private tutoring, elevated.
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.45,
              opacity: 0.92,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            {VALUE_PROPOSITION_SHORT}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "system-ui, sans-serif",
            fontSize: 22,
            opacity: 0.78,
          }}
        >
          <span>GCSE · IGCSE · A-Level · IB · Matric</span>
          <span>mytutoringhub.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
