import { TutorAvatar } from "@/components/TutorAvatar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHourly, formatMoney, pkrToCurrency, MARKET_CITIES } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { averageRateForSubject, listingPath, searchTutors, slugify } from "@/lib/search-tutors";
import { formatTutorPlace, inferTutorCountry } from "@/lib/tutor-catalog";
import { publicAvailabilityWhere } from "@/lib/past-papers/availability";
import { JsonLd } from "@/components/JsonLd";
import { SubjectStudyHubLinks } from "@/components/SubjectStudyHubLinks";
import { findTutorCtaMeta } from "@/lib/business-rules";
import {
  breadcrumbJsonLd,
  pageMetadata,
  subjectLandingJsonLd,
  truncateDescription,
} from "@/lib/seo";
import { subjectLandingShouldNoIndex } from "@/lib/seo-indexation";

type Params = { params: Promise<{ subject: string; city?: string[] }> };

function titleCaseFromSlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Params) {
  const { subject, city } = await params;
  const subjectName = titleCaseFromSlug(subject);
  const cityName = city?.[0] ? titleCaseFromSlug(city[0]) : null;
  const known = await prisma.subject.findFirst({
    where: {
      OR: [
        { slug: slugify(subjectName) },
        { name: { equals: subjectName, mode: "insensitive" } },
      ],
    },
  });
  const label = known?.name || subjectName;
  const [{ total }, avg, currency] = await Promise.all([
    searchTutors({
      subject: label,
      location: cityName || undefined,
      page: "1",
    }),
    averageRateForSubject(label),
    getVisitorCurrency(),
  ]);
  const avgLine =
    avg != null ? ` Average rate around ${formatMoney(pkrToCurrency(avg, currency), currency)}/hr.` : "";

  const title = cityName
    ? `${label} Tutors in ${cityName} – Private Lessons`
    : `${label} Tutors – Find Private Tutors Online`;

  const description = truncateDescription(
    total > 0
      ? `${total} ${label} tutors${cityName ? ` in ${cityName}` : ""} on My Tutoring Hub.${avgLine} ${findTutorCtaMeta(label)} No commission on lesson fees.`
      : `Find ${label} tutors${cityName ? ` in ${cityName}` : ""} on My Tutoring Hub. Browse free — ${findTutorCtaMeta(label)}`,
  );

  const path = cityName ? `/s/${subject}/${city![0]}` : `/s/${subject}`;

  return pageMetadata({
    title,
    description,
    path,
    noIndex: subjectLandingShouldNoIndex(total, { isCity: Boolean(cityName) }),
  });
}

export default async function SeoTutorsPage({ params }: Params) {
  const { subject, city } = await params;
  const subjectName = titleCaseFromSlug(subject);
  const cityName = city?.[0] ? titleCaseFromSlug(city[0]) : undefined;
  const currency = await getVisitorCurrency();

  const known = await prisma.subject.findFirst({
    where: {
      OR: [
        { slug: slugify(subjectName) },
        { name: { equals: subjectName, mode: "insensitive" } },
      ],
    },
  });
  const label = known?.name || subjectName;

  const { tutors, total } = await searchTutors({
    subject: label,
    location: cityName,
    page: "1",
  });
  const avg = await averageRateForSubject(label);
  const pastPaperCount = await prisma.pastPaper.count({
    where: {
      ...publicAvailabilityWhere(),
      subject: { contains: label, mode: "insensitive" },
    },
  });
  const countryName = cityName ? inferTutorCountry(cityName) : "";
  const searchHref = `/search?subject=${encodeURIComponent(label)}${
    cityName ? `&location=${encodeURIComponent(cityName)}` : ""
  }${countryName ? `&country=${encodeURIComponent(countryName)}` : ""}`;
  const landingPath = cityName ? `/s/${subject}/${city![0]}` : `/s/${subject}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Subjects", path: "/subjects" },
              { name: label, path: `/s/${subject}` },
              ...(cityName ? [{ name: cityName, path: landingPath }] : []),
            ]),
            subjectLandingJsonLd({
              subject: label,
              city: cityName,
              tutorCount: total,
              path: landingPath,
            }),
          ],
        }}
      />
    <div className="page">
      <div className="container">
        <h1 className="page-title">
          {label} tutors{cityName ? ` in ${cityName}` : ""}
        </h1>
        <p className="section-lead">
          {total} tutor{total === 1 ? "" : "s"} available.
          {avg != null && (
            <>
              {" "}
              Average rate around{" "}
              <strong>{formatMoney(pkrToCurrency(avg, currency), currency)}/hr</strong>.
            </>
          )}{" "}
          {findTutorCtaMeta(label)} No commission on lesson fees.
        </p>
        <p>
          <Link href={searchHref} className="btn btn-secondary btn-sm">
            Open full search filters
          </Link>
        </p>

        <SubjectStudyHubLinks subject={label} pastPaperCount={pastPaperCount} />
        <div className="tutor-grid" style={{ marginTop: "1.25rem" }}>
          {tutors.map((t) => {
            const tutorName = t.user.name?.trim() || "Tutor";
            return (
              <Link key={t.id} href={listingPath(t.id)} className="tutor-card">
                <TutorAvatar
                  className="tutor-avatar"
                  photoUrl={t.photoUrl}
                  cropX={t.photoCropX}
                  cropY={t.photoCropY}
                  cropZoom={t.photoCropZoom}
                  initial={tutorName.slice(0, 1).toUpperCase()}
                />
                <div>
                  <h3>{tutorName}</h3>
                  <p className="muted">{t.headline || t.subject || t.subjects}</p>
                  <div className="meta">
                    <span className="price-tag">{formatHourly(t.hourlyRate, currency)}</span>
                    <span>{formatTutorPlace(t.location, t.country)}</span>
                    {t.verified && <span className="badge">Verified</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {!cityName && (
          <section style={{ marginTop: "2rem" }}>
            <h2>Popular cities</h2>
            <div className="subject-chips">
              {MARKET_CITIES.filter((c) => c !== "Online")
                .slice(0, 12)
                .map((c) => (
                  <Link key={c} className="chip" href={`/s/${slugify(label)}/${slugify(c)}`}>
                    {label} in {c}
                  </Link>
                ))}
            </div>
          </section>
        )}
        {tutors.length === 0 && (
          <div className="panel" style={{ marginTop: "1.25rem" }}>
            <p className="muted">
              No {label} tutors are listed yet{cityName ? ` in ${cityName}` : ""}. Browse past papers,
              post a student request, or search with broader filters — this page stays useful while we
              grow tutor supply.
            </p>
            <p>
              <Link href="/ads/new" className="btn btn-sm">
                Post a student request
              </Link>{" "}
              <Link href="/become-a-tutor" className="btn btn-secondary btn-sm">
                Become a tutor
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
