// The Stats page: read / partly read / unread, broken down by any field.
// Shared by the server (which slims the library down) and the browser
// (which groups and draws). Stats cover owned books only and leave out the
// excluded category (see leftOutOfStats).

import { AUDIENCE, FACETS, SPICE, STORY_FOCUS, VIBE } from "./classification";
import type { CopyFormat, LibraryBook } from "./library";
import { RATING_GROUPS, SOURCE_LABEL, leftOutOfStats, ratingFilterLabel, ratingValue, type RatingKey } from "./library-filters";
import { AUTHOR_FACET, CATEGORIES, CHARACTER_FACET } from "./representation";

export type Status = LibraryBook["readStatus"];
export const STATUSES: { key: Status; label: string }[] = [
  { key: "read", label: "Read" },
  { key: "partly_read", label: "Partly read" },
  { key: "unread", label: "Unread" },
];

// One counted book: its status and its values for every breakdown.
export type StatBook = { s: Status; v: Record<string, string[]> };

const FORMAT_LABEL: Record<CopyFormat, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market paperback",
  print_unknown: "Print, format not set",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

export type Breakdown = {
  key: string;
  title: string;
  // Values in this order (otherwise most books first).
  order?: string[];
  // A value as shown (values are stored as labels unless this says otherwise).
  label?: (value: string) => string;
  // The library filter for one value: [param, value].
  param: (value: string) => [string, string];
};

const facet = (key: string, title: string, extra: Partial<Breakdown> = {}): Breakdown => ({
  key,
  title,
  param: (v) => ["tag", `${key}:${v}`],
  ...extra,
});
const facetTitle = (key: string) => FACETS.find((f) => f.key === key)?.title ?? key;
const rating = (key: RatingKey, title: string): Breakdown => ({
  key,
  title,
  order: RATING_GROUPS.find((g) => g.key === key)!.values,
  label: (v) => ratingFilterLabel(key, v),
  param: (v) => [key, v],
});

export const BREAKDOWN_GROUPS: { title: string; items: Breakdown[] }[] = [
  {
    title: "The books",
    items: [
      facet("genre", "Genre"),
      facet("subgenre", "Subgenre"),
      facet("book_type", "Book type"),
      facet("audience", "Audience", { order: AUDIENCE.map((a) => a[1]) }),
      { key: "format", title: "Format", order: Object.keys(FORMAT_LABEL), label: (v) => FORMAT_LABEL[v as CopyFormat] ?? v, param: (v) => ["format", v] },
      facet("multi_format", "In more than one format", { order: ["Yes", "No"] }),
      { key: "source", title: "Where it lives", label: (v) => SOURCE_LABEL[v] ?? v, param: (v) => ["source", v] },
      facet("decade", "Decade first published", { order: ["Before 1900", ...Array.from({ length: 21 }, (_, i) => `${1900 + i * 10}s`)] }),
    ],
  },
  {
    title: "The story",
    items: [
      facet("vibe", "Vibe", { order: VIBE.map((v) => v[1]) }),
      facet("spice", "Spice (Scoville Smut Scale)", { order: SPICE.map((s) => s[1]) }),
      facet("story_focus", "Story focus", { order: STORY_FOCUS.map((s) => s[1]) }),
      facet("romantic_subplot", "Romantic subplot", { order: ["Yes", "No"] }),
      ...["trope", "supernatural_being", "shifter_type", "queer_romance_type", "retelling_type", "subject", "reason"].map((k) =>
        facet(k, facetTitle(k)),
      ),
    ],
  },
  {
    title: "Your ratings and reviews",
    items: [
      rating("stars", "Stars"),
      rating("writing", "Writing quality"),
      rating("recommend", "Would I recommend it?"),
      facet("mood", "Mood reactions"),
      facet("broke_my_brain", "Broke my brain / challenged my worldview"),
      facet("would_reread", "Would re-read", { order: ["Yes", "No"] }),
      facet("has_review", "Written review", { order: ["Yes", "Not yet"] }),
    ],
  },
  {
    title: "Authors (their own words)",
    items: [
      ...CATEGORIES.map((c) => facet(AUTHOR_FACET(c.key), facetTitle(AUTHOR_FACET(c.key)).replace("Author: ", "Author "))),
      facet("own_voices", "Own voices", { order: ["Yes", "No"] }),
    ],
  },
  {
    title: "Main characters",
    items: CATEGORIES.map((c) => facet(CHARACTER_FACET(c.key), facetTitle(CHARACTER_FACET(c.key)).replace("Main character: ", "Main character "))),
  },
  {
    title: "Graphic novels and manga",
    items: ["gn_style", "manga_demographic", "franchise"].map((k) => facet(k, facetTitle(k))),
  },
];

export const BREAKDOWNS = BREAKDOWN_GROUPS.flatMap((g) => g.items);

// Server side: the counted books, slimmed to what the charts need.
export function statBooks(books: LibraryBook[]): StatBook[] {
  return books.filter((b) => !leftOutOfStats(b)).map((b) => ({ s: b.readStatus, v: breakdownValues(b) }));
}

// A book's values for every breakdown.
export function breakdownValues(b: LibraryBook): Record<string, string[]> {
  const v: Record<string, string[]> = {};
  for (const d of BREAKDOWNS) {
    const values =
      d.key === "format" ? b.formats
      : d.key === "source" ? b.sources
      : d.key === "stars" || d.key === "writing" || d.key === "recommend"
        ? // "Not rated" only means something for books she's read.
          [ratingValue(b, d.key)].filter((r) => r !== "none" || b.readStatus !== "unread")
      : (b.facets[d.key] ?? []);
    if (values.length) v[d.key] = [...new Set(values)];
  }
  return v;
}

export type Row = { value: string; label: string; counts: Record<Status, number>; total: number };

// One row per value, with how many books of each status have it. A book
// with two genres counts once in each.
export function breakdown(books: StatBook[], d: Breakdown): { rows: Row[]; without: number } {
  const rows = new Map<string, Row>();
  let without = 0;
  for (const b of books) {
    const values = b.v[d.key] ?? [];
    if (!values.length) without++;
    for (const value of values) {
      const row = rows.get(value) ?? { value, label: d.label?.(value) ?? value, counts: { read: 0, partly_read: 0, unread: 0 }, total: 0 };
      row.counts[b.s]++;
      row.total++;
      rows.set(value, row);
    }
  }
  const list = [...rows.values()];
  if (d.order) {
    const at = (v: string) => (d.order!.includes(v) ? d.order!.indexOf(v) : 9999);
    list.sort((a, b) => at(a.value) - at(b.value) || a.label.localeCompare(b.label));
  } else {
    list.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }
  return { rows: list, without };
}

// The library, filtered to these books (counted in stats only).
export function libraryHref(base: string, statuses: Status[], d?: Breakdown, value?: string) {
  const params = new URLSearchParams();
  for (const s of statuses) params.append("status", s);
  if (d && value) params.append(...d.param(value));
  params.append("flag", "counted");
  return `${base || "/"}?${params.toString()}`;
}
