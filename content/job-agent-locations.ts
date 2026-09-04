export interface JobAgentUsState {
  fullName: string;
  abbreviation: string;
}

/**
 * All 50 US states plus DC - government-standardized and complete, unlike the denylist below,
 * this table should never need updating as new companies are added to job-agent-boards.ts.
 */
export const jobAgentUsStates: JobAgentUsState[] = [
  { fullName: "Alabama", abbreviation: "AL" },
  { fullName: "Alaska", abbreviation: "AK" },
  { fullName: "Arizona", abbreviation: "AZ" },
  { fullName: "Arkansas", abbreviation: "AR" },
  { fullName: "California", abbreviation: "CA" },
  { fullName: "Colorado", abbreviation: "CO" },
  { fullName: "Connecticut", abbreviation: "CT" },
  { fullName: "Delaware", abbreviation: "DE" },
  { fullName: "Florida", abbreviation: "FL" },
  { fullName: "Georgia", abbreviation: "GA" },
  { fullName: "Hawaii", abbreviation: "HI" },
  { fullName: "Idaho", abbreviation: "ID" },
  { fullName: "Illinois", abbreviation: "IL" },
  { fullName: "Indiana", abbreviation: "IN" },
  { fullName: "Iowa", abbreviation: "IA" },
  { fullName: "Kansas", abbreviation: "KS" },
  { fullName: "Kentucky", abbreviation: "KY" },
  { fullName: "Louisiana", abbreviation: "LA" },
  { fullName: "Maine", abbreviation: "ME" },
  { fullName: "Maryland", abbreviation: "MD" },
  { fullName: "Massachusetts", abbreviation: "MA" },
  { fullName: "Michigan", abbreviation: "MI" },
  { fullName: "Minnesota", abbreviation: "MN" },
  { fullName: "Mississippi", abbreviation: "MS" },
  { fullName: "Missouri", abbreviation: "MO" },
  { fullName: "Montana", abbreviation: "MT" },
  { fullName: "Nebraska", abbreviation: "NE" },
  { fullName: "Nevada", abbreviation: "NV" },
  { fullName: "New Hampshire", abbreviation: "NH" },
  { fullName: "New Jersey", abbreviation: "NJ" },
  { fullName: "New Mexico", abbreviation: "NM" },
  { fullName: "New York", abbreviation: "NY" },
  { fullName: "North Carolina", abbreviation: "NC" },
  { fullName: "North Dakota", abbreviation: "ND" },
  { fullName: "Ohio", abbreviation: "OH" },
  { fullName: "Oklahoma", abbreviation: "OK" },
  { fullName: "Oregon", abbreviation: "OR" },
  { fullName: "Pennsylvania", abbreviation: "PA" },
  { fullName: "Rhode Island", abbreviation: "RI" },
  { fullName: "South Carolina", abbreviation: "SC" },
  { fullName: "South Dakota", abbreviation: "SD" },
  { fullName: "Tennessee", abbreviation: "TN" },
  { fullName: "Texas", abbreviation: "TX" },
  { fullName: "Utah", abbreviation: "UT" },
  { fullName: "Vermont", abbreviation: "VT" },
  { fullName: "Virginia", abbreviation: "VA" },
  { fullName: "Washington", abbreviation: "WA" },
  { fullName: "West Virginia", abbreviation: "WV" },
  { fullName: "Wisconsin", abbreviation: "WI" },
  { fullName: "Wyoming", abbreviation: "WY" },
  { fullName: "District of Columbia", abbreviation: "DC" },
];

/**
 * Direct US country markers safe to match as case-insensitive substrings - multi-word ("United
 * States") or long enough ("USA") that they essentially never appear by accident.
 */
export const jobAgentUsCountryNames: string[] = ["United States", "USA"];

/**
 * US country markers that MUST be matched as whole tokens with word boundaries (e.g. /\bUS\b/i)
 * - naive substring matching on "US" produces real false positives (it's a substring of "August").
 */
export const jobAgentUsCountryAbbreviations: string[] = ["US"];

/**
 * Non-US signal seed list, surveyed live across every company in job-agent-boards.ts (2026-09-03).
 * Add a country or city by editing this array - no other file needs to change, same as
 * jobAgentKeywordFamilies. Unlike jobAgentUsStates, this list is inherently incomplete (new
 * companies bring new location formats) - that's exactly why classifyJobLocation() (location.ts)
 * fails open to "unrecognized" rather than assuming "no match" means US, and the pipeline logs
 * unrecognized locations for periodic review.
 *
 * Countries and cities long/specific enough to match as case-insensitive substrings without
 * risking a false positive on unrelated text.
 */
export const jobAgentNonUsCountriesAndCities: string[] = [
  // Countries
  "United Kingdom",
  "England",
  "India",
  "Germany",
  "Bulgaria",
  "Switzerland",
  "Costa Rica",
  "France",
  "Japan",
  "Brazil",
  "Israel",
  "Netherlands",
  "Sweden",
  "South Korea",
  "Spain",
  "Italy",
  "Denmark",
  "United Arab Emirates",
  "Saudi Arabia",
  "Poland",
  "Canada",
  "Mexico",
  "China",
  "New Zealand",
  "Serbia",
  "Ireland",
  "Turkey",
  "Portugal",
  "Croatia",
  "Hungary",
  "Taiwan",
  "Philippines",
  "Phillipines", // common misspelling seen live (GitLab)
  "Latvia",
  "Austria",
  "Singapore",
  "Australia",
  "Thailand",
  "Belgium",
  "Finland",
  // Cities and provinces that appear without an accompanying country name
  "Bangalore",
  "Ontario",
  "Munich",
  "Dublin",
  "Paris",
  "Sydney",
  "Melbourne",
  "São Paulo",
  "Sao Paulo",
  "Tel Aviv",
  "Amsterdam",
  "Copenhagen",
  "Madrid",
  "Milan",
  "Auckland",
  "Belgrade",
  "Berlin",
  "London",
  "Shanghai",
  "Barcelona",
];

/**
 * Short non-US country/region codes - matched with word boundaries for the same reason as
 * jobAgentUsCountryAbbreviations. Deliberately excludes any 2-letter ISO code that collides with
 * a US state abbreviation (e.g. Germany's "DE" vs. Delaware) - those fall back to the full
 * country/city name above, or stay "unrecognized" for a captain to review, since a mistaken
 * "us" read is the safe fail-open direction and a mistaken "non-us" read is not.
 */
export const jobAgentNonUsCodes: string[] = [
  "UK",
  "GBR",
  "IND",
  "DEU",
  "CRI",
  "CR",
  "FRA",
  "JPN",
  "ISR",
  "SGP",
  "AUS",
  "AU",
  "UAE",
  "KSA",
  "EMEA",
  "APAC",
  "LATAM",
  "ANZ",
];
