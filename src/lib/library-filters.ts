import type { CopyFormat, LibraryBook } from "./library";

// Sort and filter for the library views. Within a group, any choice matches
// (Romance or Fantasy); across groups, all must match (Unread and Fantasy).

export const SORTS = {
  title: "Title A–Z",
  author: "Author A–Z",
  series: "Series",
  status: "Read status",
  review: "Needs review first",
} as const;
export type SortKey = keyof typeof SORTS;

export const FLAGS = {
  loan: "On loan",
  keepsake: "Keepsake",
  reference: "Reference (left out of stats)",
} as const;
export type FlagKey = keyof typeof FLAGS;

// Books with something to fix: no cover, no author, or a title or author that
// was a guess from the shelf photos.
export const REVIEW = {
  any: "Anything to review",
  cover: "Missing cover",
  author: "Missing author",
  guess: "Title or author is a guess",
} as const;
export type ReviewKey = keyof typeof REVIEW;

export function reviewReasons(b: LibraryBook): Exclude<ReviewKey, "any">[] {
  const reasons: Exclude<ReviewKey, "any">[] = [];
  if (!b.coverUrl) reasons.push("cover");
  if (!b.authors.length) reasons.push("author");
  if (b.needsCheck) reasons.push("guess");
  return reasons;
}

export type Filters = {
  q: string;
  sort: SortKey;
  status: LibraryBook["readStatus"][];
  format: CopyFormat[];
  genre: string[];
  source: string[];
  series: string[];
  flag: FlagKey[];
  review: ReviewKey[];
};

export const LIST_KEYS = ["status", "format", "genre", "source", "series", "flag", "review"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export const SOURCE_LABEL: Record<string, string> = {
  shelf: "Bookshelf",
  kobo: "Kobo",
  audible: "Audible",
  librofm: "Libro.fm",
  other: "Other",
};

export function readFilters(params: URLSearchParams): Filters {
  const sort = params.get("sort");
  return {
    q: params.get("q") ?? "",
    sort: sort && sort in SORTS ? (sort as SortKey) : "title",
    status: params.getAll("status") as Filters["status"],
    format: params.getAll("format") as CopyFormat[],
    genre: params.getAll("genre"),
    source: params.getAll("source"),
    series: params.getAll("series"),
    flag: params.getAll("flag").filter((f): f is FlagKey => f in FLAGS),
    review: [
      ...params.getAll("review").filter((r): r is ReviewKey => r in REVIEW),
      // Older links used flag=check for guessed titles.
      ...(params.getAll("flag").includes("check") ? (["guess"] as const) : []),
    ],
  };
}

export function writeFilters(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q);
  if (f.sort !== "title") params.set("sort", f.sort);
  for (const key of LIST_KEYS) for (const v of f[key]) params.append(key, v);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function activeCount(f: Filters) {
  return LIST_KEYS.reduce((n, k) => n + f[k].length, 0);
}

export function fold(text: string) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function titleKey(title: string) {
  return fold(title).replace(/^(the|a|an)\s+/, "");
}

function surnameKey(book: LibraryBook) {
  const first = book.authors[0];
  if (!first) return "￿";
  const words = fold(first).replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return `${words[words.length - 1]} ${words.slice(0, -1).join(" ")}`;
}

const STATUS_ORDER = { unread: 0, partly_read: 1, read: 2 };

export function applyFilters(books: LibraryBook[], f: Filters): LibraryBook[] {
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  const matches = (b: LibraryBook) => {
    if (words.length) {
      const hay = fold([b.title, b.series ?? "", ...b.authors].join(" "));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.status.length && !f.status.includes(b.readStatus)) return false;
    if (f.format.length && !b.formats.some((x) => f.format.includes(x))) return false;
    if (f.genre.length && !b.genres.some((x) => f.genre.includes(x))) return false;
    if (f.source.length && !b.sources.some((x) => f.source.includes(x))) return false;
    if (f.series.length && !(b.series && f.series.includes(b.series))) return false;
    for (const flag of f.flag) {
      if (flag === "loan" && !b.onLoanTo.length) return false;
      if (flag === "keepsake" && !b.hasKeepsake) return false;
      if (flag === "reference" && !(b.isReference || b.bookType === "picture_book")) return false;
    }
    if (f.review.length) {
      const reasons = reviewReasons(b);
      if (!f.review.some((r) => (r === "any" ? reasons.length > 0 : reasons.includes(r)))) return false;
    }
    return true;
  };

  const byTitle = (a: LibraryBook, b: LibraryBook) => titleKey(a.title).localeCompare(titleKey(b.title));
  const compare: Record<SortKey, (a: LibraryBook, b: LibraryBook) => number> = {
    title: byTitle,
    author: (a, b) => surnameKey(a).localeCompare(surnameKey(b)) || byTitle(a, b),
    series: (a, b) =>
      (a.series ?? "￿").localeCompare(b.series ?? "￿") ||
      (a.seriesNumber ?? 999) - (b.seriesNumber ?? 999) ||
      byTitle(a, b),
    status: (a, b) => STATUS_ORDER[a.readStatus] - STATUS_ORDER[b.readStatus] || byTitle(a, b),
    review: (a, b) => reviewReasons(b).length - reviewReasons(a).length || byTitle(a, b),
  };

  return books.filter(matches).sort(compare[f.sort]);
}

// The choices each filter group offers, with how many books have each.
export function filterOptions(books: LibraryBook[]) {
  const count = (values: string[]) => {
    const m = new Map<string, number>();
    for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  return {
    genre: count(books.flatMap((b) => b.genres)),
    source: count(books.flatMap((b) => b.sources)),
    series: count(books.flatMap((b) => (b.series ? [b.series] : []))),
    format: count(books.flatMap((b) => b.formats)),
    review: count(books.flatMap((b) => {
      const reasons = reviewReasons(b);
      return reasons.length ? ["any", ...reasons] : [];
    })),
  };
}
