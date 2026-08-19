"use client";

type TutorAvatarProps = {
  photoUrl?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropZoom?: number | null;
  initial?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function TutorAvatar({
  photoUrl,
  cropX = 0,
  cropY = 0,
  cropZoom = 1,
  initial = "?",
  size,
  className,
  style,
}: TutorAvatarProps) {
  const x = cropX ?? 0;
  const y = cropY ?? 0;
  const zoom = cropZoom ?? 1;

  const containerStyle: React.CSSProperties = {
    overflow: "hidden",
    borderRadius: "50%",
    position: "relative",
    flexShrink: 0,
    ...(size ? { width: size, height: size } : {}),
    ...style,
  };

  if (!photoUrl?.startsWith("http")) {
    return (
      <div className={className} style={containerStyle} aria-hidden>
        {initial}
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${x}%, ${y}%) scale(${zoom})`,
          transformOrigin: "center center",
          position: "absolute",
          inset: 0,
        }}
      />
    </div>
  );
}
