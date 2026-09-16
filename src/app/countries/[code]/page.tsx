import Link from "next/link";
import { notFound } from "next/navigation";
import { TutorAvatar } from "@/components/TutorAvatar";
import { JsonLd } from "@/components/JsonLd";
import { formatHourly } from "@/lib/currency";
import { getVisitorCurrency } from "@/lib/visitor-currency";
import { countryByCode, subjectCode, type MarketCountry } from "@/lib/markets";
import { uniqueSubjectsForCountry } from "@/lib/curriculum";
import { listingPath, searchTutors, slugify } from "@/lib/search-tutors";
import { formatTutorPlace } from "@/lib/tutor-catalog";
import {
  breadcrumbJsonLd,
  countryLandingJsonLd,
  pageMetadata,
  truncateDescription,
} from "@/lib/seo";
import { subjectLandingShouldNoIndex } from "@/lib/seo-indexation";
import { studentContactRuleShort } from "@/lib/business-rules";

type Params = { params: Promise<{ code: string }> };

function resolveCountry(codeParam: string): MarketCountry | null {
  const code = decodeURIComponent(codeParam).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return countryByCode(code);
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params) {
  const { code } = await params;
  const country = resolveCountry(code);
  if (!country) {
    return pageMetadata({
      title: "Country not found",
      path: `/countries/${code}`,
      noIndex: true,
    });
  }

  const { total } = await searchTutors({ country: country.name, page: "1" });
  const subjects = uniqueSubjectsForCountry(country.name);
  const topSubjects = (subjects.length ? subjects : country.subjects).slice(0, 5).join(", ");
  const path = `/countries/${country.code.toLowerCase()}`;

  return pageMetadata({
    title: `Tutors in ${country.name} – Online & In-Person Private Lessons`,
    description: truncateDescription(
      total > 0
        ? `${total} tutors in ${country.name} on My Tutoring Hub. Popular: ${topSubjects}. ${studentContactRuleShort()} No lesson commission.`
        : `Find private tutors in ${country.name} — ${topSubjects}. Browse free on My Tutoring Hub. ${studentContactRuleShort()}`,
    ),
    path,
    noIndex: subjectLandingShouldNoIndex(total),
  });
}

export default async function CountryTutorsPage({ params }: Params) {
  const { code } = await params;
  const country = resolveCountry(code);
  if (!country) notFound();

  const currency = await getVisitorCurrency();
  const path = `/countries/${country.code.toLowerCase()}`;
  const { tutors, total } = await searchTutors({ country: country.name, page: "1" });
  const catalog = uniqueSubjectsForCountry(country.name);
  const subjects = (catalog.length ? catalog : country.subjects).slice(0, 16);
  const cities = country.cities.slice(0, 8);
  const searchHref = `/search?country=${encodeURIComponent(country.name)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Subjects", path: "/subjects" },
              { name: country.name, path },
            ]),
            countryLandingJsonLd({
              country: country.name,
              code: country.code,
              tutorCount: total,
              path,
              cities: country.cities,
              subjects: country.subjects,
            }),
          ],
        }}
      />
      <div className="page">
        <div className="container">
          <h1 className="page-title">Tutors in {country.name}</h1>
          <p className="section-lead">
            {total > 0
              ? `${total} tutor${total === 1 ? "" : "s"} available. ${studentContactRuleShort()}`
              : `Browse popular subjects and cities in ${country.name}. New tutors appear in search as they publish Teaching Profiles.`}{" "}
            No commission on lesson fees.
          </p>

          {cities.length > 0 ? (
            <p className="muted" style={{ marginBottom: "1rem" }}>
              Cities:{" "}
              {cities.map((city, i) => (
                <span key={city}>
                  <Link
                    href={`/search?country=${encodeURIComponent(country.name)}&location=${encodeURIComponent(city)}`}
                  >
                    {city}
                  </Link>
                  {i < cities.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          ) : null}

          <div className="subject-chips" style={{ marginBottom: "1.5rem" }}>
            {subjects.map((subject) => (
              <Link
                key={subject}
                href={`/s/${slugify(subject)}`}
                className="chip"
                title={`${subjectCode(subject)} · ${subject}`}
              >
                <span className="subject-code">{subjectCode(subject)}</span>
                <span className="chip-text">{subject}</span>
              </Link>
            ))}
          </div>

          <p className="section-actions" style={{ marginBottom: "1.5rem" }}>
            <Link href={searchHref} className="btn">
              Search tutors in {country.name}
            </Link>
            <Link href="/become-a-tutor" className="btn btn-secondary">
              Teach in {country.name}
            </Link>
          </p>

          {tutors.length > 0 ? (
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
                        <span>{formatTutorPlace(t.location, t.country || country.name)}</span>
                        {t.verified ? <span className="badge">Verified</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="panel" style={{ marginTop: "1.25rem" }}>
              <p className="muted">
                No tutors are listed yet for {country.name}. Browse subjects, post a student request,
                or search worldwide while supply grows.
              </p>
              <p>
                <Link href="/ads/new" className="btn btn-sm">
                  Post a student request
                </Link>{" "}
                <Link href="/search" className="btn btn-secondary btn-sm">
                  Search worldwide
                </Link>
              </p>
            </div>
          )}

          {total > tutors.length ? (
            <p className="section-actions" style={{ marginTop: "1.25rem" }}>
              <Link href={searchHref} className="btn btn-secondary">
                See all {total} results
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
