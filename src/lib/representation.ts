// Author and character representation (docs/author-representation-plan.md).
// Shared by the server and the browser.
//
// Gender, 2SLGBTQIA+ and neurodivergence are picked from short lists so they
// group in filters; the author's exact words stay in the quote. The other
// three are written in the author's own words.

export type IdentityCategory =
  | "gender_identity"
  | "lgbtqia"
  | "race_ethnicity"
  | "disability"
  | "neurodivergence"
  | "nationality_region";

export const CATEGORIES: { key: IdentityCategory; label: string; picks: string[] | null; hint: string }[] = [
  {
    key: "gender_identity",
    label: "Gender identity",
    picks: ["Woman", "Man", "Non-binary", "Genderfluid", "Agender", "Two-Spirit"],
    hint: "Pick one, or type their own word",
  },
  {
    key: "lgbtqia",
    label: "2SLGBTQIA+",
    picks: ["Lesbian", "Gay", "Bisexual", "Pansexual", "Queer", "Asexual", "Aromantic", "Trans", "Intersex", "Two-Spirit"],
    hint: "Pick one, or type their own word",
  },
  { key: "race_ethnicity", label: "Race / ethnicity", picks: null, hint: "In their own words, e.g. Black British, Mi'kmaw" },
  { key: "disability", label: "Disability", picks: null, hint: "In their own words, e.g. chronic illness, Deaf" },
  {
    key: "neurodivergence",
    label: "Neurodivergence",
    picks: ["Autistic", "ADHD", "Dyslexic", "Dyspraxic"],
    hint: "Pick one, or type their own word",
  },
  {
    key: "nationality_region",
    label: "Nationality / region",
    picks: null,
    hint: "As specific as they put it, e.g. Atlantic Canadian",
  },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])) as Record<IdentityCategory, string>;

export function isCategory(v: unknown): v is IdentityCategory {
  return typeof v === "string" && v in CATEGORY_LABEL;
}

export type IdentityValue = {
  id: string;
  category: IdentityCategory;
  value: string;
  source: string;
  sourceUrl: string | null;
  quote: string | null;
  confirmed: boolean;
  characterName?: string | null;
};

// Filter groups (see FACETS): author values, character values, own voices.
export const AUTHOR_FACET = (c: IdentityCategory) => `author_${c}`;
export const CHARACTER_FACET = (c: IdentityCategory) => `character_${c}`;
export const UNKNOWN = "Unknown";

export function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
