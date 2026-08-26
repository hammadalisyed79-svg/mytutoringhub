import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business-rules";

/** Display name used in titles and structured data. */
export const SITE_NAME = "My Tutoring Hub";
/** Compact form for OG siteName and title template suffix. */
export const SITE_NAME_COMPACT = "MyTutoringHub";
export const DEFAULT_SITE_URL = "https://www.mytutoringhub.com";

export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";
export const DEFAULT_OG_IMAGE_ALT =
  "My Tutoring Hub — Find tutors free. Pay only for messaging access.";

const DEFAULT_DESCRIPTION =
  "Find tutors free. Pay only for messaging access and study tools — lesson fees stay between you and the tutor. GCSE, IGCSE, A-Level, IB, Matric, and more.";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

/** Shared Open Graph / Twitter preview image for all public pages. */
export function defaultOgImages() {
  return [
    {
      url: DEFAULT_OG_IMAGE_PATH,
      width: 1200,
      height: 630,
      alt: DEFAULT_OG_IMAGE_ALT,
      type: "image/png" as const,
    },
  ];
}

export function truncateDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

type PageMetaInput = {
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "profile";
};

/** Standard metadata for indexable public pages. */
export function pageMetadata(opts: PageMetaInput): Metadata {
  const description = truncateDescription(opts.description || DEFAULT_DESCRIPTION);
  const canonical = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const url = absoluteUrl(canonical);
  const ogTitle = opts.ogTitle || opts.title;
  const ogDescription = opts.ogDescription || description;

  return {
    title: pageTitle(opts.title),
    description,
    alternates: { canonical },
    ...(opts.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: opts.ogType || "website",
      locale: "en_GB",
      siteName: SITE_NAME_COMPACT,
      title: ogTitle,
      description: ogDescription,
      url,
      images: defaultOgImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [DEFAULT_OG_IMAGE_PATH],
    },
  };
}

/** Metadata for authenticated / utility routes that should not rank. */
export function privateMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description: truncateDescription(description) } : {}),
    robots: { index: false, follow: false },
  };
}

/** Strip redundant site suffix — root layout title template adds `| MyTutoringHub`. */
export function pageTitle(label: string) {
  return label
    .replace(/\s*[–—-]\s*My Tutoring Hub\s*$/i, "")
    .replace(/\s*[–—-]\s*MyTutoringHub\s*$/i, "")
    .trim();
}

export function organizationSameAsLinks(): string[] {
  const url = siteUrl();
  const raw =
    process.env.SITE_SOCIAL_URLS ||
    process.env.NEXT_PUBLIC_SITE_SOCIAL_URLS ||
    "";
  const external = raw
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter((entry) => /^https:\/\//i.test(entry));
  return [...new Set([url, ...external])];
}

export function organizationJsonLd() {
  const url = siteUrl();
  return {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: SITE_NAME,
    url,
    logo: `${url}/logo.svg`,
    email: "admin@mytutoringhub.com",
    sameAs: organizationSameAsLinks(),
  };
}

export function websiteJsonLd() {
  const url = siteUrl();
  return {
    "@type": "WebSite",
    "@id": `${url}/#website`,
    name: SITE_NAME,
    url,
    publisher: { "@id": `${url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const url = siteUrl();
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function tutorProfileJsonLd(opts: {
  id: string;
  name: string;
  description: string;
  subjects: string;
  location: string;
  hourlyRatePkr: number;
  currency: string;
  hourlyLabel: string;
  photoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number;
  verified?: boolean;
}) {
  const url = absoluteUrl(`/tutors/${opts.id}`);
  const data: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${url}#person`,
    name: opts.name,
    description: truncateDescription(opts.description, 300),
    url,
    jobTitle: `${opts.subjects.split(/[,;/|]/)[0]?.trim() || "Private"} tutor`,
    knowsAbout: opts.subjects
      .split(/[,;/|]/)
      .map((s) => s.trim())
      .filter(Boolean),
    address: opts.location,
  };
  if (opts.photoUrl?.startsWith("http")) {
    data.image = opts.photoUrl;
  }
  if (opts.rating != null && opts.reviewCount && opts.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: opts.rating.toFixed(1),
      reviewCount: opts.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  data.makesOffer = {
    "@type": "Offer",
    price: opts.hourlyLabel.replace(/[^\d.,]/g, "") || String(opts.hourlyRatePkr),
    priceCurrency: opts.currency,
    description: `Private tutoring — ${opts.subjects}`,
    url,
  };
  if (opts.verified) {
    data.hasCredential = {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Verified tutor",
    };
  }
  return data;
}

export function subjectLandingJsonLd(opts: {
  subject: string;
  city?: string;
  tutorCount: number;
  path: string;
}) {
  return {
    "@type": "CollectionPage",
    name: opts.city ? `${opts.subject} tutors in ${opts.city}` : `${opts.subject} tutors`,
    description: `${opts.tutorCount} ${opts.subject} tutors on ${SITE_NAME}. Browse free — ${BUSINESS.studentFreeContactsPerMonth} new tutor contacts/month included; Student Pass unlocks unlimited messaging.`,
    url: absoluteUrl(opts.path),
    about: { "@type": "Thing", name: opts.subject },
  };
}

export function pastPaperLearningResourceJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  board: string;
  level: string;
}) {
  return {
    "@type": "LearningResource",
    name: opts.name,
    description: truncateDescription(opts.description, 300),
    url: absoluteUrl(opts.path),
    learningResourceType: "Past examination paper",
    educationalLevel: opts.level,
    provider: { "@type": "Organization", name: opts.board },
  };
}

export function faqPageJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
