import Image from "next/image";

type TutorAvatarProps = {
  photoUrl?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropZoom?: number | null;
  initial?: string;
  /** Optional explicit px size; otherwise CSS class (tutor-avatar / profile-photo-lg) sizes the box. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Prefer for above-the-fold / LCP avatars only. */
  priority?: boolean;
};

/**
 * Cropped avatar. Uses next/image so multi‑MB blob uploads are resized for display
 * instead of transferring full originals into small cards.
 */
export function TutorAvatar({
  photoUrl,
  cropX = 0,
  cropY = 0,
  cropZoom = 1,
  initial = "?",
  size,
  className,
  style,
  priority = false,
}: TutorAvatarProps) {
  const x = cropX ?? 0;
  const y = cropY ?? 0;
  const zoom = cropZoom ?? 1;

  const containerStyle: React.CSSProperties = {
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
    ...(size != null ? { width: size, height: size } : {}),
    ...style,
  };

  if (!photoUrl?.startsWith("http")) {
    return (
      <div className={className} style={containerStyle} aria-hidden>
        {initial}
      </div>
    );
  }

  const isCardAvatar = className?.includes("tc-avatar-card");
  const sizesHint =
    size != null
      ? `${size}px`
      : className?.includes("profile-photo")
        ? "(max-width: 520px) 120px, 160px"
        : isCardAvatar
          ? "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 320px"
          : className?.includes("tc-avatar")
            ? "64px"
            : "54px";
  const quality = isCardAvatar ? 80 : 72;

  return (
    <div className={className} style={containerStyle} aria-hidden>
      <Image
        src={photoUrl}
        alt=""
        fill
        sizes={sizesHint}
        quality={quality}
        priority={priority}
        style={{
          objectFit: "cover",
          transform: `translate(${x}%, ${y}%) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
