import type { CopyFormat, LibraryBook } from "./library";
import { fold } from "./library-filters";

// Bookstore lookup: "do I own this?", which formats, and how the series
// stands. Pure functions so the page can answer instantly as she types.

const PRINT: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown"];
const KNOWN_PRINT: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market"];

export const PRINT_NAME: Partial<Record<CopyFormat, string>> = {
  hardcover: "hardcover",
  trade_paperback: "trade paperback",
  mass_market: "mass-market",
  print_unknown: "print (type not set)",
};

function words(text: string) {
  return fold(text)
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !["the", "a", "an"].includes(w));
}

export type Match = { book: LibraryBook; score: number };

// Every word typed must start a word in the title, author or series.
// Exact titles rank first, then title matches, then author or series matches.
export function findBooks(books: LibraryBook[], query: string, limit = 12): Match[] {
  const q = words(query);
  if (!q.length) return [];
  const qJoined = q.join(" ");
  const matches: Match[] = [];
  for (const book of books) {
    const titleWords = words(book.title);
    const otherWords = [...book.authors.flatMap(words), ...(book.series ? words(book.series) : [])];
    const all = [...titleWords, ...otherWords];
    if (!q.every((w) => all.some((x) => x.startsWith(w)))) continue;
    const title = titleWords.join(" ");
    const score =
      title === qJoined ? 100
      : title.startsWith(qJoined) ? 80
      : q.every((w) => titleWords.some((x) => x.startsWith(w))) ? 60
      : 30;
    matches.push({ book, score });
  }
  return matches
    .sort((a, b) => b.score - a.score || (a.book.seriesNumber ?? 0) - (b.book.seriesNumber ?? 0) || a.book.title.localeCompare(b.book.title))
    .slice(0, limit);
}

// Which formats she owns, and whether it's a "no print yet" collecting candidate.
export function formatSummary(book: LibraryBook) {
  const hasPrint = book.copies.some((c) => PRINT.includes(c.format));
  const digital = [...new Set(book.copies.filter((c) => !PRINT.includes(c.format)).map((c) => c.format))];
  return { hasPrint, digitalOnly: !hasPrint && digital.length > 0 };
}

export type SeriesVolume = {
  number: number;
  book: LibraryBook | null;
  printFormat: CopyFormat | null;
};

export type SeriesStatus = {
  name: string;
  volumes: SeriesVolume[];
  unnumbered: LibraryBook[];
  missing: number[];
  noPrint: number[];
  matchFormat: CopyFormat | null;
  mismatched: number[];
};

// Owned volumes in order, gaps between 1 and the highest owned number, and
// print-format mismatches (the most common known print type is the one to buy).
export function seriesStatus(books: LibraryBook[], name: string): SeriesStatus {
  const inSeries = books.filter((b) => b.series === name);
  const numbered = inSeries.filter((b) => b.seriesNumber != null && Number.isInteger(Number(b.seriesNumber)) && Number(b.seriesNumber) > 0);
  const byNumber = new Map(numbered.map((b) => [Number(b.seriesNumber), b]));
  const highest = Math.max(0, ...byNumber.keys());

  const printOf = (b: LibraryBook) => {
    const formats = b.copies.map((c) => c.format);
    return KNOWN_PRINT.find((f) => formats.includes(f)) ?? (formats.includes("print_unknown") ? "print_unknown" : null);
  };

  const volumes: SeriesVolume[] = [];
  for (let n = 1; n <= highest; n++) {
    const book = byNumber.get(n) ?? null;
    volumes.push({ number: n, book, printFormat: book ? printOf(book) : null });
  }

  const counts = new Map<CopyFormat, number>();
  for (const v of volumes) {
    if (v.printFormat && KNOWN_PRINT.includes(v.printFormat)) counts.set(v.printFormat, (counts.get(v.printFormat) ?? 0) + 1);
  }
  const matchFormat = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    name,
    volumes,
    unnumbered: inSeries.filter((b) => !numbered.includes(b)).sort((a, b) => a.title.localeCompare(b.title)),
    missing: volumes.filter((v) => !v.book).map((v) => v.number),
    noPrint: volumes.filter((v) => v.book && !v.printFormat).map((v) => v.number),
    matchFormat,
    mismatched: matchFormat
      ? volumes.filter((v) => v.printFormat && KNOWN_PRINT.includes(v.printFormat) && v.printFormat !== matchFormat).map((v) => v.number)
      : [],
  };
}

// Series whose name matches the search, for "which Kate Daniels do I have?".
export function findSeries(books: LibraryBook[], query: string, limit = 3): string[] {
  const q = words(query);
  if (!q.length) return [];
  const names = [...new Set(books.flatMap((b) => (b.series ? [b.series] : [])))];
  return names
    .filter((n) => {
      const w = words(n);
      return q.every((x) => w.some((y) => y.startsWith(x)));
    })
    .slice(0, limit);
}

// Compact "#1–#5, #7" style list.
export function ranges(numbers: number[]) {
  const out: string[] = [];
  const sorted = [...numbers].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(i === j ? `#${sorted[i]}` : `#${sorted[i]}–#${sorted[j]}`);
    i = j;
  }
  return out.join(", ");
}
