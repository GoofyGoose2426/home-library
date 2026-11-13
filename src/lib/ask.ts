// Ask your library: a question becomes one of these read-only lookups, which
// the app runs over her own books (under her login) and draws as a sentence,
// bars or a list. A pinned answer saves the lookup, not the answer, so it's
// always current. Nothing here can change data: a lookup only picks books
// (which status, which values) and says how to show them.

import type { LibraryBook } from "./library";
import { alphaCompare, authorSortKey, leftOutOfStats } from "./library-filters";
import { BREAKDOWNS, STATUSES, breakdown, breakdownValues, type Breakdown, type Row, type Status } from "./stats";

export type Measure = "stars" | "writing" | "audio";
export type ListSort = "title" | "author" | "stars";

export type Lookup = {
  v: 1;
  // Which books, by read status (all when left out).
  status?: Status[];
  // Each condition must hold. any: has one of these values. except: has a
  // value other than these (e.g. any author 2SLGBTQIA+ value except Unknown).
  where?: { field: string; any?: string[]; except?: string[] }[];
  // Lists only: include reference and picture books, left out of stats.
  leftOut?: boolean;
  show:
    | { kind: "count" }
    // then: for each of the top values, what's inside it (e.g. each trope's
    // genres). top: how many values to show (all when left out).
    | { kind: "group"; by: string; then?: string[]; top?: number }
    | { kind: "average"; of: Measure; by?: string }
    | { kind: "list"; sort?: ListSort; limit?: number }
    // Which fields have the most books with no value yet, or only Unknown.
    | { kind: "missing" };
};

export const MEASURES: Record<Measure, string> = { stars: "Stars", writing: "Writing quality", audio: "Audio performance" };
const SORTS: ListSort[] = ["title", "author", "stars"];

const field = (key: string) => BREAKDOWNS.find((d) => d.key === key);
const strings = (x: unknown, max: number) =>
  Array.isArray(x) && x.length > 0 && x.length <= max && x.every((s) => typeof s === "string" && s.length > 0 && s.length <= 200);

// Strict check of a lookup from a link or the database. Anything unexpected
// is refused, so only these shapes can ever run.
export function parseLookup(raw: unknown): Lookup | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const l = raw as Record<string, unknown>;
  const allowed = new Set(["v", "status", "where", "leftOut", "show"]);
  if (l.v !== 1 || Object.keys(l).some((k) => !allowed.has(k))) return null;
  if (l.status !== undefined && !(strings(l.status, 3) && (l.status as string[]).every((s) => STATUSES.some((x) => x.key === s)))) return null;
  if (l.leftOut !== undefined && typeof l.leftOut !== "boolean") return null;
  if (l.where !== undefined) {
    if (!Array.isArray(l.where) || l.where.length > 8) return null;
    for (const w of l.where) {
      if (!w || typeof w !== "object" || Object.keys(w).some((k) => !["field", "any", "except"].includes(k))) return null;
      if (!field(w.field)) return null;
      if (w.any === undefined && w.except === undefined) return null;
      if (w.any !== undefined && !strings(w.any, 50)) return null;
      if (w.except !== undefined && !strings(w.except, 50)) return null;
    }
  }
  const show = l.show as Record<string, unknown> | undefined;
  if (!show || typeof show !== "object") return null;
  const keys = Object.keys(show);
  const only = (...k: string[]) => keys.every((x) => x === "kind" || k.includes(x));
  switch (show.kind) {
    case "count":
      if (!only()) return null;
      break;
    case "group":
      if (!only("by", "then", "top") || !field(show.by as string)) return null;
      if (show.then !== undefined && !(strings(show.then, 2) && (show.then as string[]).every((k) => field(k) && k !== show.by))) return null;
      if (show.top !== undefined && !(Number.isInteger(show.top) && (show.top as number) >= 1 && (show.top as number) <= 50)) return null;
      break;
    case "average":
      if (!only("of", "by") || !(show.of as string in MEASURES)) return null;
      if (show.by !== undefined && !field(show.by as string)) return null;
      break;
    case "list":
      if (!only("sort", "limit")) return null;
      if (show.sort !== undefined && !SORTS.includes(show.sort as ListSort)) return null;
      if (show.limit !== undefined && !(Number.isInteger(show.limit) && (show.limit as number) >= 1 && (show.limit as number) <= 500)) return null;
      break;
    case "missing":
      if (!only()) return null;
      break;
    default:
      return null;
  }
  return raw as Lookup;
}

// How the answer is drawn (saved beside a pinned report).
export function chartType(l: Lookup): "sentence" | "bars" | "table" {
  return l.show.kind === "list" ? "table"
    : l.show.kind === "group" || l.show.kind === "missing" || (l.show.kind === "average" && l.show.by) ? "bars"
    : "sentence";
}

export type ListBook = { id: string; title: string; authors: string[]; status: Status; rating: number | null };
export type AvgRow = { value: string; label: string; avg: number; n: number };

export type Inner = { by: string; items: { value: string; label: string; n: number }[] };
export type MissingRow = { key: string; title: string; missing: number; of: number };

export type Answer =
  | { type: "count"; n: number; of: number; counts: Record<Status, number> }
  // inner: for each shown value, what's inside it (when the lookup asks).
  | { type: "bars"; by: string; rows: Row[]; without: number; of: number; inner?: Record<string, Inner[]> }
  | { type: "missing"; rows: MissingRow[] }
  | { type: "average"; of: Measure; avg: number | null; n: number }
  | { type: "average_bars"; of: Measure; by: string; rows: AvgRow[] }
  | { type: "list"; books: ListBook[]; total: number };

// Values that mean "not known yet".
const GAPS = ["Unknown", "none", "print_unknown"];
type Applies = (b: LibraryBook, v: Record<string, string[]>) => boolean;
const always: Applies = () => true;
const romance: Applies = (_, v) => (v.genre ?? []).includes("Romance") || (v.romantic_subplot ?? []).includes("Yes");
const read: Applies = (b) => b.readStatus !== "unread";
// The fields "what's missing" checks, and which books each one applies to
// (spice only to romance or a romantic subplot; your ratings only to books
// you've read). Format counts print books whose format isn't set.
const MISSING_FIELDS: { key: string; applies: Applies }[] = [
  { key: "genre", applies: always },
  { key: "subgenre", applies: always },
  { key: "audience", applies: always },
  { key: "vibe", applies: always },
  { key: "romantic_subplot", applies: always },
  { key: "spice", applies: romance },
  { key: "story_focus", applies: romance },
  { key: "format", applies: always },
  { key: "decade", applies: always },
  { key: "reason", applies: always },
  { key: "stars", applies: read },
  { key: "writing", applies: read },
  { key: "recommend", applies: read },
  { key: "author_gender_identity", applies: always },
  { key: "author_race_ethnicity", applies: always },
  { key: "author_lgbtqia", applies: always },
  { key: "author_disability", applies: always },
  { key: "author_neurodivergence", applies: always },
  { key: "author_nationality_region", applies: always },
  { key: "own_voices", applies: always },
];

const measure = (b: LibraryBook, m: Measure) => (m === "stars" ? b.rating : m === "writing" ? b.writingQuality : b.audioPerformance);

// Runs a lookup over the books she owns (loadLibrary already leaves out the
// Gone list). Stats rules: reference and picture books are left out unless a
// list asks for them.
export function runLookup(all: LibraryBook[], l: Lookup): Answer {
  const scope = all.filter((b) => (l.show.kind === "list" && l.leftOut) || !leftOutOfStats(b));
  const picked = scope
    .map((b) => ({ b, v: breakdownValues(b) }))
    .filter(({ b, v }) => {
      if (l.status?.length && !l.status.includes(b.readStatus)) return false;
      for (const w of l.where ?? []) {
        const values = v[w.field] ?? [];
        if (w.any && !values.some((x) => w.any!.includes(x))) return false;
        if (w.except && !values.some((x) => !w.except!.includes(x))) return false;
      }
      return true;
    });

  const show = l.show;
  if (show.kind === "count") {
    const counts: Record<Status, number> = { read: 0, partly_read: 0, unread: 0 };
    for (const { b } of picked) counts[b.readStatus]++;
    return { type: "count", n: picked.length, of: scope.length, counts };
  }
  if (show.kind === "group") {
    const { rows, without } = breakdown(
      picked.map(({ b, v }) => ({ s: b.readStatus, v })),
      field(show.by)!,
    );
    const shown = show.top ? rows.slice(0, show.top) : rows;
    if (!show.then?.length) return { type: "bars", by: show.by, rows: shown, without, of: picked.length };
    const inner: Record<string, Inner[]> = {};
    for (const row of shown) {
      const within = picked.filter(({ v }) => (v[show.by] ?? []).includes(row.value)).map(({ b, v }) => ({ s: b.readStatus, v }));
      inner[row.value] = show.then.map((k) => ({
        by: k,
        items: breakdown(within, field(k)!).rows.map((r) => ({ value: r.value, label: r.label, n: r.total })),
      }));
    }
    return { type: "bars", by: show.by, rows: shown, without, of: picked.length, inner };
  }
  if (show.kind === "missing") {
    const rows = MISSING_FIELDS.map(({ key, applies }) => {
      const d = field(key)!;
      const fits = picked.filter((p) => applies(p.b, p.v));
      const missing = fits.filter(({ v }) => {
        const values = v[key] ?? [];
        return !values.length || values.every((x) => GAPS.includes(x));
      }).length;
      return { key, title: d.title, missing, of: fits.length };
    })
      .filter((r) => r.of > 0)
      .sort((a, b) => b.missing / b.of - a.missing / a.of || b.missing - a.missing);
    return { type: "missing", rows };
  }
  if (show.kind === "average") {
    const rated = picked.filter(({ b }) => measure(b, show.of) != null);
    const avg = (list: typeof rated) => list.reduce((sum, { b }) => sum + measure(b, show.of)!, 0) / list.length;
    if (!show.by) return { type: "average", of: show.of, avg: rated.length ? avg(rated) : null, n: rated.length };
    const d = field(show.by)!;
    const groups = new Map<string, typeof rated>();
    for (const r of rated) for (const value of r.v[show.by] ?? []) groups.set(value, [...(groups.get(value) ?? []), r]);
    const rows = [...groups.entries()]
      .map(([value, list]) => ({ value, label: d.label?.(value) ?? value, avg: avg(list), n: list.length }))
      .sort((a, b) => b.avg - a.avg || b.n - a.n);
    return { type: "average_bars", of: show.of, by: show.by, rows };
  }
  const sort = show.sort ?? "title";
  const books = picked
    .map(({ b }) => ({ id: b.id, title: b.title, authors: b.authors, status: b.readStatus, rating: b.rating }))
    .sort((a, z) =>
      sort === "stars"
        ? (z.rating ?? -1) - (a.rating ?? -1) || alphaCompare(a.title, z.title)
        : sort === "author"
          ? authorSortKey(a.authors[0]).localeCompare(authorSortKey(z.authors[0])) || alphaCompare(a.title, z.title)
          : alphaCompare(a.title, z.title),
    );
  return { type: "list", books: books.slice(0, show.limit ?? 200), total: books.length };
}

// The lookup in plain words, shown under every answer so she can see exactly
// what was counted.
export function describe(l: Lookup): string {
  const parts: string[] = [];
  parts.push(
    l.status?.length
      ? `${l.status.map((s) => STATUSES.find((x) => x.key === s)!.label).join(" or ")} books`
      : "All books",
  );
  for (const w of l.where ?? []) {
    const d = field(w.field)!;
    const name = (v: string) => d.label?.(v) ?? v;
    if (w.any) parts.push(`${d.title}: ${w.any.map(name).join(" or ")}`);
    if (w.except) parts.push(`${d.title}: anything but ${w.except.map(name).join(" or ")}`);
  }
  const s = l.show;
  // "Author 2SLGBTQIA+" stays as it is; other names start lower case.
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const how =
    s.kind === "count" ? "counted"
    : s.kind === "group"
      ? `grouped by ${lower(field(s.by)!.title)}${s.top ? ` (top ${s.top})` : ""}${s.then?.length ? `, then by ${s.then.map((k) => lower(field(k)!.title)).join(" and ")} within each` : ""}`
    : s.kind === "missing" ? "for each field, how many books have no value yet or only Unknown"
    : s.kind === "average" ? `average ${lower(MEASURES[s.of])}${s.by ? ` by ${lower(field(s.by)!.title)}` : ""}`
    : `listed by ${s.sort ?? "title"}`;
  const out = l.show.kind === "list" && l.leftOut ? "including reference and picture books" : "not counting reference and picture books";
  return `${parts.join(" · ")} → ${how} (${out}).`;
}

// The same books in the library, when the library's filters can show them
// exactly (they can't do "anything but"). extra: one more value, for a bar.
export function lookupHref(base: string, l: Lookup, extra?: { d: Breakdown; value: string }, status?: Status[]): string | null {
  const fields = (l.where ?? []).map((w) => w.field).concat(extra ? [extra.d.key] : []);
  // Two conditions on one field mean "both" here but "either" in the library.
  if (l.where?.some((w) => w.except) || new Set(fields).size < fields.length) return null;
  const params = new URLSearchParams();
  for (const s of status ?? l.status ?? []) params.append("status", s);
  for (const w of l.where ?? []) for (const v of w.any ?? []) params.append(...field(w.field)!.param(v));
  if (extra) params.append(...extra.d.param(extra.value));
  if (!(l.show.kind === "list" && l.leftOut)) params.append("flag", "counted");
  return `${base || "/"}?${params.toString()}`;
}

// The address of an answer page, for a lookup written in a Claude session.
export function askHref(question: string, l: Lookup) {
  return `/ask?q=${encodeURIComponent(question)}&l=${encodeURIComponent(JSON.stringify(l))}`;
}
