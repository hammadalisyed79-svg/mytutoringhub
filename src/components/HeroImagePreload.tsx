import { HERO_IMAGE_DESKTOP, HERO_IMAGE_MOBILE } from "@/lib/hero-media";

/** Preload LCP hero photograph early (homepage only). */
export function HeroImagePreload() {
  return (
    <link
      rel="preload"
      as="image"
      href={HERO_IMAGE_MOBILE}
      imageSrcSet={`${HERO_IMAGE_MOBILE} 900w, ${HERO_IMAGE_DESKTOP} 1400w`}
      imageSizes="100vw"
      // High priority for LCP; React types may lag the DOM attribute.
      {...{ fetchPriority: "high" }}
    />
  );
}
