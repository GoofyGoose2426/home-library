// The fields on the "To check" screen (see review_column in the database).
// Shared by the server and the browser.

export type ReviewKind = "long" | "text" | "number" | "series" | "choice" | "tag";

export const REVIEW_FIELDS: { key: string; label: string; kind: ReviewKind; note?: string }[] = [
  { key: "titles.description", label: "Descriptions", kind: "long" },
  { key: "titles.first_published", label: "First published", kind: "number" },
  { key: "titles.typical_pages", label: "Typical length (pages)", kind: "number" },
  { key: "copies.est_words", label: "Word estimates", kind: "number", note: "Worked out from the page count" },
  { key: "copies.publisher", label: "Publisher", kind: "text" },
  { key: "copies.pages", label: "Pages", kind: "number" },
  { key: "titles.series", label: "Series", kind: "series", note: "To change a series, use Edit details on the book page" },
  { key: "titles.audience", label: "Audience", kind: "choice" },
  { key: "titles.vibe", label: "Vibe", kind: "choice" },
  { key: "titles.romantic_subplot", label: "Romantic subplot", kind: "choice" },
  { key: "titles.spice", label: "Spice", kind: "choice" },
  { key: "titles.story_focus", label: "Story focus", kind: "choice" },
  { key: "tags.genre", label: "Genres", kind: "tag" },
  { key: "tags.subgenre", label: "Subgenres", kind: "tag" },
  { key: "tags.supernatural_being", label: "Supernatural beings", kind: "tag" },
  { key: "tags.shifter_type", label: "Shifter types", kind: "tag" },
  { key: "tags.queer_romance_type", label: "Queer romance types", kind: "tag" },
  { key: "tags.retelling_type", label: "Retelling types", kind: "tag" },
  { key: "tags.trope", label: "Tropes", kind: "tag" },
  { key: "tags.subject", label: "Subjects", kind: "tag" },
  { key: "tags.reason", label: "Reasons for reading", kind: "tag" },
  { key: "tags.gn_style", label: "Graphic novel style", kind: "tag" },
  { key: "tags.manga_demographic", label: "Manga demographic", kind: "tag" },
  { key: "tags.franchise", label: "Universe / franchise", kind: "tag" },
];

export const SOURCE_NAME: Record<string, string> = {
  openlibrary: "Open Library",
  googlebooks: "Google Books",
  claude: "Claude",
  import: "your shelf photos",
};
