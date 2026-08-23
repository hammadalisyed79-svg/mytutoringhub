import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHourly, formatMoney, pkrToCurrency, MARKET_CITIES } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { averageRateForSubject, searchTutors, slugify } from "@/lib/search-tutors";
import { formatTutorPlace, inferTutorCountry } from "@/lib/tutor-catalog";
import { JsonLd } from "@/components/JsonLd";
import { findTutorCtaMeta } from "@/lib/business-rules";
import {
  breadcrumbJsonLd,
  pageMetadata,
  subjectLandingJsonLd,
  truncateDescription,
} from "@/lib/seo";

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
  const { total } = await searchTutors({
    subject: label,
    location: cityName || undefined,
    page: "1",
  });
  const avg = await averageRateForSubject(label);
  const currency = await getVisitorCurrency();
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

  const path = cityName
    ? `/s/${subject}/${city![0]}`
    : `/s/${subject}`;

  return pageMetadata({
    title,
    description,
    path,
    noIndex: total === 0,
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
          </Link>{" "}
          <Link
            href={`/past-papers?subject=${encodeURIComponent(label)}`}
            className="btn btn-secondary btn-sm"
          >
            Past papers 2016–2025
          </Link>
        </p>
        <div className="tutor-grid" style={{ marginTop: "1.25rem" }}>
          {tutors.map((t) => (
            <Link key={t.id} href={`/tutors/${t.id}`} className="tutor-card">
              <div className="tutor-avatar" aria-hidden>
                {t.user.name.slice(0, 1)}
              </div>
              <div>
                <h3>{t.user.name}</h3>
                <p className="muted">{t.headline || t.subjects}</p>
                <div className="meta">
                  <span className="price-tag">{formatHourly(t.hourlyRate, currency)}</span>
                  <span>{formatTutorPlace(t.location, t.country)}</span>
                </div>
              </div>
            </Link>
          ))}
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
        {tutors.length === 0 && <p className="muted">No tutors yet for this search.</p>}
      </div>
    </div>
    </>
  );
}
