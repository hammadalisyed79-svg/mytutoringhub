/** ISO 3166-1 alpha-2 markets we feature, with country-wise top tutoring subjects. */

export type MarketCountry = {
  code: string;
  name: string;
  cities: string[];
  subjects: string[];
};

/** Pakistan first, then the next 14 highest tutoring-demand countries for this marketplace. */
export const TOP_COUNTRIES: MarketCountry[] = [
  {
    code: "PK",
    name: "Pakistan",
    cities: ["Karachi", "Lahore", "Islamabad"],
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "English",
      "Urdu",
      "O Level Maths",
      "A Level Chemistry",
      "IELTS",
      "CSS Prep",
      "Quran Nazra",
      "Computer Science",
    ],
  },
  {
    code: "IN",
    name: "India",
    cities: ["Mumbai", "Delhi", "Bangalore"],
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "English",
      "JEE Prep",
      "NEET Prep",
      "CBSE Maths",
      "Spoken English",
      "Computer Science",
      "Accounting",
      "IELTS",
    ],
  },
  {
    code: "US",
    name: "United States",
    cities: ["New York", "Los Angeles", "Houston"],
    subjects: [
      "Mathematics",
      "SAT Prep",
      "ACT Prep",
      "AP Calculus",
      "English",
      "Spanish",
      "Physics",
      "Chemistry",
      "Computer Science",
      "Algebra",
      "Biology",
      "Writing",
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    cities: ["London", "Manchester", "Birmingham"],
    subjects: [
      "Mathematics",
      "English",
      "GCSE Maths",
      "A Level Physics",
      "A Level Chemistry",
      "Biology",
      "11 Plus",
      "IELTS",
      "French",
      "Spanish",
      "Computer Science",
      "Economics",
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    cities: ["Dubai", "Abu Dhabi", "Sharjah"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "IELTS",
      "Arabic",
      "IB Maths",
      "SAT Prep",
      "Computer Science",
      "Biology",
      "Accounting",
      "Spoken English",
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    cities: ["Riyadh", "Jeddah", "Dammam"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "Arabic",
      "Quran Nazra",
      "IELTS",
      "SAT Prep",
      "Computer Science",
      "Biology",
      "Spoken English",
      "Islamic Studies",
    ],
  },
  {
    code: "CA",
    name: "Canada",
    cities: ["Toronto", "Vancouver", "Calgary"],
    subjects: [
      "Mathematics",
      "English",
      "French",
      "Physics",
      "Chemistry",
      "Biology",
      "SAT Prep",
      "Computer Science",
      "Calculus",
      "Accounting",
      "IELTS",
      "Spanish",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    cities: ["Sydney", "Melbourne", "Brisbane"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "Biology",
      "ATAR Maths",
      "IELTS",
      "Computer Science",
      "French",
      "Japanese",
      "Accounting",
      "Economics",
    ],
  },
  {
    code: "BD",
    name: "Bangladesh",
    cities: ["Dhaka", "Chittagong", "Sylhet"],
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "English",
      "Bangla",
      "IELTS",
      "SSC Maths",
      "HSC Physics",
      "Computer Science",
      "Accounting",
      "Quran Nazra",
    ],
  },
  {
    code: "EG",
    name: "Egypt",
    cities: ["Cairo", "Alexandria", "Giza"],
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "English",
      "Arabic",
      "Biology",
      "IGCSE Maths",
      "SAT Prep",
      "Computer Science",
      "Accounting",
      "French",
      "Quran Nazra",
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    cities: ["Lagos", "Abuja", "Port Harcourt"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "Biology",
      "WAEC Maths",
      "JAMB Prep",
      "IELTS",
      "Computer Science",
      "Accounting",
      "Spoken English",
      "Economics",
    ],
  },
  {
    code: "MY",
    name: "Malaysia",
    cities: ["Kuala Lumpur", "Penang", "Johor Bahru"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "Biology",
      "Bahasa Melayu",
      "Additional Maths",
      "IELTS",
      "Computer Science",
      "Accounting",
      "Mandarin",
      "SPM Maths",
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    cities: ["Singapore"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "Biology",
      "Additional Maths",
      "Chinese",
      "PSLE Maths",
      "Computer Science",
      "Economics",
      "Accounting",
      "IELTS",
    ],
  },
  {
    code: "QA",
    name: "Qatar",
    cities: ["Doha"],
    subjects: [
      "Mathematics",
      "English",
      "Physics",
      "Chemistry",
      "Arabic",
      "IELTS",
      "SAT Prep",
      "Computer Science",
      "Biology",
      "Accounting",
      "IB Maths",
      "Quran Nazra",
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    cities: ["Johannesburg", "Cape Town", "Durban"],
    subjects: [
      "Mathematics",
      "English",
      "Physical Science",
      "Life Sciences",
      "Afrikaans",
      "Accounting",
      "Computer Science",
      "IELTS",
      "Economics",
      "Spoken English",
      "Biology",
      "Physics",
    ],
  },
];

export function allMarketSubjects() {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const country of TOP_COUNTRIES) {
    for (const subject of country.subjects) {
      if (seen.has(subject)) continue;
      seen.add(subject);
      out.push(subject);
    }
  }
  return out;
}

export function allMarketCities() {
  const seen = new Set<string>();
  const out: string[] = ["Online"];
  for (const country of TOP_COUNTRIES) {
    for (const city of country.cities) {
      if (seen.has(city)) continue;
      seen.add(city);
      out.push(city);
    }
  }
  return out;
}

export function countryByCode(code: string) {
  return TOP_COUNTRIES.find((c) => c.code === code.toUpperCase()) || null;
}
