import type { CopyFormat, LibraryBook } from "./library";
import { FACETS } from "./classification";
import { AUDIO, RECOMMEND, WRITING, find } from "./ratings";

// Sort and filter for the library views. Within a group, any choice matches
// (Romance or Fantasy); across groups, all must match (Unread and Fantasy).

export const SORTS = {
  title: "Title A–Z",
  author: "Author A–Z",
  series: "Series",
  status: "Read status",
  review: "Needs review first",
  stars: "Stars, highest first",
  writing: "Writing quality, highest first",
  recommend: "Recommendation",
  audio: "Audio performance, highest first",
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
  // Classification, as "group:value" (e.g. "subgenre:Fantasy romance").
  tag: string[];
  source: string[];
  series: string[];
  flag: FlagKey[];
  review: ReviewKey[];
  stars: string[];
  writing: string[];
  recommend: string[];
  audio: string[];
};

export const LIST_KEYS = [
  "status", "format", "tag", "source", "series", "flag", "review", "stars", "writing", "recommend", "audio",
] as const;

// Rating filters. Stars group by whole star ("4" is 4.00–4.75); "none" is
// not rated yet.
export type RatingKey = "stars" | "writing" | "recommend" | "audio";
export const RATING_GROUPS: { key: RatingKey; title: string; values: string[] }[] = [
  { key: "stars", title: "Stars", values: ["5", "4", "3", "2", "1", "none"] },
  { key: "writing", title: "Writing quality", values: ["5", "4", "3", "2", "1", "none"] },
  { key: "recommend", title: "Would I recommend it?", values: ["everyone", "specific", "no", "none"] },
  { key: "audio", title: "Audio performance (audiobooks)", values: ["5", "4", "3", "2", "1", "none"] },
];

export function ratingValue(b: LibraryBook, key: RatingKey): string {
  const v =
    key === "stars" ? (b.rating === null ? null : Math.floor(b.rating))
    : key === "writing" ? b.writingQuality
    : key === "recommend" ? b.recommendation
    : b.audioPerformance;
  return v === null ? "none" : String(v);
}

export function ratingFilterLabel(key: RatingKey, v: string) {
  if (v === "none") return key === "audio" ? "Audiobook, not rated" : "Not rated";
  if (key === "stars") return v === "5" ? "★ 5.00" : `★ ${v}.00–${v}.75`;
  if (key === "writing") return `${v} ${find(WRITING, Number(v))?.label}`;
  if (key === "audio") return `${v} ${find(AUDIO, Number(v))?.label}`;
  return find(RECOMMEND, v as "no")?.label ?? v;
}
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
    // Older links used genre=Romance.
    tag: [...params.getAll("tag"), ...params.getAll("genre").map((g) => `genre:${g}`)],
    source: params.getAll("source"),
    series: params.getAll("series"),
    flag: params.getAll("flag").filter((f): f is FlagKey => f in FLAGS),
    stars: params.getAll("stars"),
    writing: params.getAll("writing"),
    recommend: params.getAll("recommend"),
    audio: params.getAll("audio"),
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
const RECOMMEND_RANK: Record<string, number> = { everyone: 3, specific: 2, no: 1 };

// Highest first, with unrated books last.
function highFirst(a: number | null | undefined, b: number | null | undefined) {
  return (b ?? -1) - (a ?? -1);
}

export function applyFilters(books: LibraryBook[], f: Filters): LibraryBook[] {
  const words = fold(f.q).split(/\s+/).filter(Boolean);
  const matches = (b: LibraryBook) => {
    if (words.length) {
      const hay = fold([b.title, b.series ?? "", ...b.authors].join(" "));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.status.length && !f.status.includes(b.readStatus)) return false;
    if (f.format.length && !b.formats.some((x) => f.format.includes(x))) return false;
    if (f.tag.length) {
      const groups = new Map<string, string[]>();
      for (const t of f.tag) {
        const i = t.indexOf(":");
        groups.set(t.slice(0, i), [...(groups.get(t.slice(0, i)) ?? []), t.slice(i + 1)]);
      }
      for (const [key, values] of groups) if (!(b.facets[key] ?? []).some((x) => values.includes(x))) return false;
    }
    if (f.source.length && !b.sources.some((x) => f.source.includes(x))) return false;
    if (f.series.length && !(b.series && f.series.includes(b.series))) return false;
    for (const flag of f.flag) {
      if (flag === "loan" && !b.onLoanTo.length) return false;
      if (flag === "keepsake" && !b.hasKeepsake) return false;
      if (flag === "reference" && !(b.isReference || b.bookType === "picture_book")) return false;
    }
    for (const g of RATING_GROUPS) {
      if (!f[g.key].length) continue;
      // Audio applies only to books with an audiobook copy.
      if (g.key === "audio" && !b.formats.includes("audiobook")) return false;
      if (!f[g.key].includes(ratingValue(b, g.key))) return false;
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
    stars: (a, b) => highFirst(a.rating, b.rating) || byTitle(a, b),
    writing: (a, b) => highFirst(a.writingQuality, b.writingQuality) || byTitle(a, b),
    recommend: (a, b) => highFirst(RECOMMEND_RANK[a.recommendation ?? ""], RECOMMEND_RANK[b.recommendation ?? ""]) || byTitle(a, b),
    audio: (a, b) => highFirst(a.audioPerformance, b.audioPerformance) || byTitle(a, b),
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
    tag: Object.fromEntries(
      FACETS.map((g) => [g.key, count(books.flatMap((b) => b.facets[g.key] ?? []))]),
    ) as Record<string, [string, number][]>,
    source: count(books.flatMap((b) => b.sources)),
    series: count(books.flatMap((b) => (b.series ? [b.series] : []))),
    format: count(books.flatMap((b) => b.formats)),
    ...(Object.fromEntries(
      RATING_GROUPS.map((g) => [
        g.key,
        count(books.filter((b) => g.key !== "audio" || b.formats.includes("audiobook")).map((b) => ratingValue(b, g.key))),
      ]),
    ) as Record<RatingKey, [string, number][]>),
    review: count(books.flatMap((b) => {
      const reasons = reviewReasons(b);
      return reasons.length ? ["any", ...reasons] : [];
    })),
  };
}
