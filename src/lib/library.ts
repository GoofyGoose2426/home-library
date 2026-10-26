import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CopyFormat = "hardcover" | "trade_paperback" | "mass_market" | "print_unknown" | "ebook" | "audiobook";

export type LibraryBook = {
  id: string;
  title: string;
  authors: string[];
  series: string | null;
  seriesNumber: number | null;
  readStatus: "unread" | "partly_read" | "read";
  bookType: string;
  isReference: boolean;
  needsCheck: boolean;
  formats: CopyFormat[];
  locations: string[];
  onLoanTo: string[];
  sources: string[];
  genres: string[];
  hasKeepsake: boolean;
  coverUrl: string | null;
  coverConfirmed: boolean;
};

type Row = {
  id: string;
  title: string;
  read_status: LibraryBook["readStatus"];
  book_type: string;
  is_reference: boolean;
  needs_check: boolean;
  series_number: number | null;
  series: { name: string } | null;
  credits: { role: string; position: number; people: { name: string } | null }[];
  title_tags: { tags: { kind: string; name: string } | null }[];
  copies: {
    format: CopyFormat;
    source: string;
    keepsake_notes: string | null;
    location: string | null;
    cover_url: string | null;
    cover_confirmed: boolean;
    on_loan_to: string | null;
  }[];
};

const FORMAT_ORDER: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"];

// Every title Alexandra owns, with what the grid and table show. RLS limits
// this to her rows; PostgREST returns at most 1,000 rows, so read in pages.
export async function loadLibrary(supabase: SupabaseClient): Promise<LibraryBook[]> {
  const books: LibraryBook[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("titles")
      .select(
        `id, title, read_status, book_type, is_reference, needs_check, series_number,
         series(name),
         credits(role, position, people(name)),
         title_tags(tags(kind, name)),
         copies(format, source, keepsake_notes, location, cover_url, cover_confirmed, on_loan_to)`,
      )
      .order("title")
      .range(from, from + 999)
      .returns<Row[]>();
    if (error) throw new Error(error.message);
    for (const t of data ?? []) {
      const cover = t.copies.find((c) => c.cover_url);
      books.push({
        id: t.id,
        title: t.title,
        authors: t.credits
          .filter((c) => c.role === "author" || c.role === "writer" || c.role === "editor")
          .sort((a, b) => a.position - b.position)
          .flatMap((c) => (c.people ? [c.people.name] : [])),
        series: t.series?.name ?? null,
        seriesNumber: t.series_number,
        readStatus: t.read_status,
        bookType: t.book_type,
        isReference: t.is_reference,
        needsCheck: t.needs_check,
        formats: [...new Set(t.copies.map((c) => c.format))].sort(
          (a, b) => FORMAT_ORDER.indexOf(a) - FORMAT_ORDER.indexOf(b),
        ),
        locations: [...new Set(t.copies.flatMap((c) => (c.location ? [c.location] : [])))],
        onLoanTo: t.copies.flatMap((c) => (c.on_loan_to ? [c.on_loan_to] : [])),
        sources: [...new Set(t.copies.map((c) => c.source))],
        genres: t.title_tags.flatMap((tt) => (tt.tags?.kind === "genre" ? [tt.tags.name] : [])),
        hasKeepsake: t.copies.some((c) => !!c.keepsake_notes?.trim()),
        coverUrl: cover?.cover_url ?? null,
        coverConfirmed: cover?.cover_confirmed ?? false,
      });
    }
    if ((data ?? []).length < 1000) break;
  }
  return books;
}
