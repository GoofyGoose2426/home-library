import "server-only";
import { fold } from "./library-filters";

// Looks a book up on Open Library (and Google Books, when there's a key) by
// title and author, and returns details to fill in. A match needs the same
// title and at least one shared author surname; anything less is skipped
// rather than guessed. Edition details (publisher, pages) only come from a
// copy's own ISBN.

const UA = "HomeLibraryCatalog/1.0 (+https://home-library-mocha.vercel.app)";
const OL = "https://openlibrary.org";

export type DetailsInput = {
  title: string;
  authors: string[];
  copies: { id: string; format: string; isbn13: string | null; pages: number | null }[];
};

type Source = "openlibrary" | "googlebooks";

// Title details, one set per source, so each value is credited to where it
// really came from. The sets never share a field.
export type Found = {
  titles: TitleDetails[];
  // Why Google Books couldn't be used for this book, if it couldn't.
  googleError?: string;
  copies: { id: string; source: Source; publisher?: string; pages?: number; est_words?: number }[];
};

type TitleDetails = {
  source: Source;
  description?: string;
  first_published?: number;
  typical_pages?: number;
  openlibrary_key?: string;
  series?: string;
  series_number?: number;
};

// Rough words per page by format; labelled as an estimate wherever shown.
const WORDS_PER_PAGE: Record<string, number> = { mass_market: 300 };
const DEFAULT_WORDS_PER_PAGE = 275;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(1000);
    }
  }
  throw new Error("The book service didn't answer. Try again in a few minutes.");
}

// Google answers errors (bad key, API not enabled, daily limit) with a
// message; pass it on instead of quietly finding nothing.
async function getGoogle(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (res.ok) return res.json();
  let message = `Google Books answered ${res.status}`;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body.error?.message) message += `: ${body.error.message}`;
  } catch {}
  throw new Error(message);
}

export async function testGoogleBooks(key: string) {
  const data = (await getGoogle(
    `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q: "intitle:Kindred inauthor:Butler", maxResults: "3", key })}`,
  )) as { totalItems?: number };
  return data.totalItems ?? 0;
}

const VOLUME = /(?:\bvol(?:ume)?\.?|\bbook|#)\s*(\d+)/i;

// "A Hunger Like No Other (Immortals After Dark, Book 1)" → "hunger like no other"
export function titleKey(s: string) {
  return fold(s)
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .split(/[:;]/)[0]
    .replace(VOLUME, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

export function volumeOf(s: string) {
  return s.match(VOLUME)?.[1] ?? null;
}

function surname(name: string) {
  const words = fold(name).replace(/\(.*?\)/g, "").replace(/[^a-z ]+/g, " ").trim().split(/\s+/);
  return words[words.length - 1] ?? "";
}

export function sameBook(ours: { title: string; authors: string[] }, theirs: { title: string; authors: string[] }) {
  if (!titleKey(ours.title) || titleKey(ours.title) !== titleKey(theirs.title)) return false;
  const vol = volumeOf(ours.title);
  if (vol && volumeOf(theirs.title) !== vol) return false;
  if (!ours.authors.length) return false;
  const theirSurnames = new Set(theirs.authors.map(surname));
  return ours.authors.some((a) => theirSurnames.has(surname(a)));
}

// "(The Immortals After Dark Series, Book 1)" → { series: "The Immortals After Dark", number: 1 }
export function seriesFromTitle(s: string) {
  const m = s.match(/\(([^()]+?)[,\s]+(?:book|bk\.?|#|vol\.?|volume|no\.?)\s*(\d+(?:\.\d+)?)\)/i);
  if (!m) return null;
  const series = m[1].replace(/\s+series$/i, "").trim();
  return series.length >= 3 ? { series, number: Number(m[2]) } : null;
}

// Open Library descriptions often end in source links or a contents list.
export function cleanDescription(raw: unknown) {
  const text = typeof raw === "string" ? raw : (raw as { value?: string } | null)?.value;
  if (!text) return undefined;
  const clean = text
    .split(/\n-{3,}/)[0]
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\(\[source\]\[\d+\]\)/gi, "")
    .replace(/^\s*\[\d+\]:.*$/gm, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean.length >= 40 ? clean : undefined;
}

type OlDoc = { key: string; title: string; author_name?: string[]; first_publish_year?: number; number_of_pages_median?: number };

async function fromOpenLibrary(book: DetailsInput): Promise<TitleDetails | null> {
  const params = new URLSearchParams({
    title: book.title.replace(/\(.*?\)/g, "").trim(),
    limit: "8",
    fields: "key,title,author_name,first_publish_year,number_of_pages_median",
  });
  if (book.authors[0]) params.set("author", book.authors[0]);
  const data = (await getJson(`${OL}/search.json?${params}`)) as { docs?: OlDoc[] } | null;
  const doc = data?.docs?.find((d) => sameBook(book, { title: d.title, authors: d.author_name ?? [] }));
  if (!doc) return null;
  await sleep(300);
  const work = (await getJson(`${OL}${doc.key}.json`)) as { description?: unknown } | null;
  const series = seriesFromTitle(doc.title);
  return {
    source: "openlibrary",
    openlibrary_key: /^\/works\/OL\d+W$/.test(doc.key) ? doc.key : undefined,
    description: cleanDescription(work?.description),
    first_published: doc.first_publish_year && doc.first_publish_year >= 1000 ? doc.first_publish_year : undefined,
    typical_pages: doc.number_of_pages_median && doc.number_of_pages_median < 5000 ? doc.number_of_pages_median : undefined,
    ...(series ? { series: series.series, series_number: series.number } : {}),
  };
}

type GVolume = { volumeInfo?: { title?: string; subtitle?: string; authors?: string[]; description?: string; pageCount?: number } };

async function fromGoogleBooks(book: DetailsInput, key: string): Promise<TitleDetails | null> {
  const clean = book.title.replace(/\(.*?\)/g, "").trim();
  const q = `intitle:${clean}${book.authors[0] ? ` inauthor:${book.authors[0]}` : ""}`;
  const data = (await getGoogle(
    `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q, maxResults: "8", printType: "books", key })}`,
  )) as { items?: GVolume[] } | null;
  const vol = data?.items?.find((v) => sameBook(book, { title: v.volumeInfo?.title ?? "", authors: v.volumeInfo?.authors ?? [] }));
  if (!vol?.volumeInfo) return null;
  const info = vol.volumeInfo;
  const series = seriesFromTitle(`${info.title ?? ""} ${info.subtitle ? `(${info.subtitle})` : ""}`);
  return {
    source: "googlebooks",
    description: cleanDescription(info.description),
    typical_pages: info.pageCount && info.pageCount > 20 && info.pageCount < 5000 ? info.pageCount : undefined,
    ...(series ? { series: series.series, series_number: series.number } : {}),
  };
}

export async function findDetails(book: DetailsInput, googleKey?: string): Promise<Found> {
  const titles: TitleDetails[] = [];
  let googleError: string | undefined;
  const ol = await fromOpenLibrary(book);
  if (ol) titles.push(ol);
  // Google Books fills only what Open Library didn't have.
  if (googleKey && (!ol?.description || !ol.typical_pages || !ol.series)) {
    await sleep(200);
    let g: TitleDetails | null = null;
    try {
      g = await fromGoogleBooks(book, googleKey);
    } catch (e) {
      googleError = e instanceof Error ? e.message : "Google Books didn't answer.";
    }
    if (g) {
      const extra: TitleDetails = { source: "googlebooks" };
      if (!ol?.description && g.description) extra.description = g.description;
      if (!ol?.typical_pages && g.typical_pages) extra.typical_pages = g.typical_pages;
      if (!ol?.series && g.series) Object.assign(extra, { series: g.series, series_number: g.series_number });
      if (Object.keys(extra).length > 1) titles.push(extra);
    }
  }
  const typical = titles.find((t) => t.typical_pages);

  const copies: Found["copies"] = [];
  for (const c of book.copies) {
    if (c.format === "audiobook") continue;
    const found: Found["copies"][number] = { id: c.id, source: "openlibrary" };
    let pages = c.pages ?? undefined;
    if (c.isbn13) {
      await sleep(300);
      const ed = (await getJson(`${OL}/isbn/${c.isbn13}.json`)) as { publishers?: string[]; number_of_pages?: number } | null;
      if (ed?.publishers?.[0]) found.publisher = ed.publishers[0];
      if (!pages && ed?.number_of_pages && ed.number_of_pages < 5000) pages = found.pages = ed.number_of_pages;
    }
    // Word estimate from this copy's pages, else a typical edition's.
    if (pages || typical) {
      if (!pages && !found.publisher) found.source = typical!.source;
      found.est_words = Math.round(((pages ?? typical!.typical_pages!) * (WORDS_PER_PAGE[c.format] ?? DEFAULT_WORDS_PER_PAGE)) / 1000) * 1000;
    }
    if (found.publisher || found.pages || found.est_words) copies.push(found);
  }
  return { titles, copies, googleError };
}
