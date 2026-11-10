import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signCoverPaths } from "./covers";
import { alphaCompare } from "./library-filters";
import type { CopyFormat, CopySource } from "./library";
import type { Recommendation } from "./ratings";

// Series: the list of them all, and one series with its volumes in order.

export type SeriesSummary = { id: string; name: string; owned: number; read: number; authors: string[]; rating: number | null };

// Her review of the series as a whole, beside each book's own.
export type SeriesReview = {
  rating: number | null;
  writingQuality: number | null;
  recommendation: Recommendation | null;
  body: string | null;
};

type ReviewRow = { rating: number | null; writing_quality: number | null; recommendation: Recommendation | null; body: string | null };

const toReview = (r: ReviewRow | undefined): SeriesReview | null =>
  r ? { rating: r.rating == null ? null : Number(r.rating), writingQuality: r.writing_quality, recommendation: r.recommendation, body: r.body } : null;

export type SeriesVolume = {
  id: string;
  title: string;
  number: number | null;
  authors: string[];
  readStatus: "unread" | "partly_read" | "read";
  copies: { format: CopyFormat; source: CopySource }[];
  owned: boolean;
  coverUrl: string | null;
  coverConfirmed: boolean;
};

export type SeriesPage = { id: string; name: string; volumes: SeriesVolume[]; review: SeriesReview | null };

// A book that could be added to a series, for the search on the series page.
export type SeriesCandidate = { id: string; title: string; authors: string[]; series: string | null; number: number | null };

type Credit = { role: string; position: number; people: { name: string } | null };

const writers = (credits: Credit[]) =>
  credits
    .filter((c) => c.role !== "narrator")
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => (c.people ? [c.people.name] : []));

export async function loadSeriesList(supabase: SupabaseClient): Promise<SeriesSummary[]> {
  type Row = {
    id: string;
    name: string;
    titles: { read_status: string; credits: Credit[]; copies: { gone_at: string | null }[] }[];
    reviews: { rating: number | null }[];
  };
  const out: SeriesSummary[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("series")
      .select("id, name, titles(read_status, credits(role, position, people(name)), copies(gone_at)), reviews(rating)")
      .order("name")
      .range(from, from + 999)
      .returns<Row[]>();
    if (error) throw new Error(error.message);
    for (const s of data ?? []) {
      const owned = s.titles.filter((t) => t.copies.some((c) => !c.gone_at));
      out.push({
        id: s.id,
        name: s.name,
        owned: owned.length,
        read: owned.filter((t) => t.read_status === "read").length,
        authors: [...new Set(owned.flatMap((t) => writers(t.credits)))].slice(0, 3),
        rating: s.reviews[0]?.rating == null ? null : Number(s.reviews[0].rating),
      });
    }
    if ((data ?? []).length < 1000) break;
  }
  return out.sort((a, b) => alphaCompare(a.name, b.name));
}

const FORMAT_ORDER: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"];

// shared: the view-only link, which can't see her own cover photos.
export async function loadSeries(
  supabase: SupabaseClient,
  id: string,
  { shared = false }: { shared?: boolean } = {},
): Promise<SeriesPage | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const copyColumns = shared ? "format, source, gone_at, cover_url, cover_confirmed" : "format, source, gone_at, cover_url, cover_path, cover_confirmed";
  type Row = {
    id: string;
    name: string;
    titles: {
      id: string;
      title: string;
      series_number: number | null;
      read_status: SeriesVolume["readStatus"];
      credits: Credit[];
      copies: { format: CopyFormat; source: CopySource; gone_at: string | null; cover_url: string | null; cover_path?: string | null; cover_confirmed: boolean }[];
    }[];
    reviews: ReviewRow[];
  };
  const { data, error } = await supabase
    .from("series")
    .select(`id, name, reviews(rating, writing_quality, recommendation, body), titles(id, title, series_number, read_status, credits(role, position, people(name)), copies(${copyColumns}))`)
    .eq("id", id)
    .maybeSingle<Row>();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const volumes = data.titles.map((t): SeriesVolume => {
    const owned = t.copies.filter((c) => !c.gone_at);
    const cover = owned.find((c) => c.cover_path) ?? owned.find((c) => c.cover_url);
    return {
      id: t.id,
      title: t.title,
      number: t.series_number == null ? null : Number(t.series_number),
      authors: writers(t.credits),
      readStatus: t.read_status,
      copies: owned.map((c) => ({ format: c.format, source: c.source })).sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)),
      owned: owned.length > 0,
      coverUrl: cover?.cover_path ? `photo:${cover.cover_path}` : (cover?.cover_url ?? null),
      coverConfirmed: cover?.cover_path ? true : (cover?.cover_confirmed ?? false),
    };
  });
  // The view-only link only shows books she still owns.
  const shown = shared ? volumes.filter((v) => v.owned) : volumes;
  shown.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || alphaCompare(a.title, b.title));

  const signed = await signCoverPaths(
    supabase,
    shown.flatMap((v) => (v.coverUrl?.startsWith("photo:") ? [v.coverUrl.slice(6)] : [])),
  );
  for (const v of shown) if (v.coverUrl?.startsWith("photo:")) v.coverUrl = signed.get(v.coverUrl.slice(6)) ?? null;

  return { id: data.id, name: data.name, volumes: shown, review: toReview(data.reviews[0]) };
}

// Every book she owns, to search when adding one to a series.
export async function loadSeriesCandidates(supabase: SupabaseClient): Promise<SeriesCandidate[]> {
  type Row = {
    id: string;
    title: string;
    series_number: number | null;
    series: { name: string } | null;
    credits: Credit[];
    copies: { gone_at: string | null }[];
  };
  const out: SeriesCandidate[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("titles")
      .select("id, title, series_number, series(name), credits(role, position, people(name)), copies(gone_at)")
      .order("title")
      .range(from, from + 999)
      .returns<Row[]>();
    if (error) throw new Error(error.message);
    for (const t of data ?? []) {
      if (!t.copies.some((c) => !c.gone_at)) continue;
      out.push({
        id: t.id,
        title: t.title,
        authors: writers(t.credits),
        series: t.series?.name ?? null,
        number: t.series_number == null ? null : Number(t.series_number),
      });
    }
    if ((data ?? []).length < 1000) break;
  }
  return out;
}
