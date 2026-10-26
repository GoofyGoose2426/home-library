import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CopyFormat, CopySource } from "./library";

export type FieldSource = { source: string; confirmed: boolean };

export type BookCopy = {
  id: string;
  format: CopyFormat;
  source: CopySource;
  publisher: string | null;
  edition: string | null;
  editionType: string | null;
  isbn13: string | null;
  isbn10: string | null;
  coverUrl: string | null;
  coverConfirmed: boolean;
  pages: number | null;
  audioMinutes: number | null;
  estWords: number | null;
  containsFrom: number | null;
  containsTo: number | null;
  bonusNotes: string | null;
  keepsakeNotes: string | null;
  onLoanTo: string | null;
  narrators: string[];
  sources: Record<string, FieldSource>;
};

export type SeriesBook = {
  id: string;
  title: string;
  number: number | null;
  readStatus: string;
  formats: CopyFormat[];
};

export type Book = {
  id: string;
  title: string;
  subtitle: string | null;
  credits: { name: string; role: string }[];
  series: { id: string; name: string; number: number | null; books: SeriesBook[] } | null;
  readStatus: "unread" | "partly_read" | "read";
  bookType: string;
  isReference: boolean;
  needsCheck: boolean;
  checkNote: string | null;
  description: string | null;
  romanticSubplot: boolean | null;
  spice: string | null;
  storyFocus: string | null;
  vibeMain: string | null;
  vibeSecond: string | null;
  rating: number | null;
  pieces: { id: string; title: string; kind: string; isRead: boolean }[];
  genres: { name: string; kind: string; source: string; confirmed: boolean }[];
  copies: BookCopy[];
  sources: Record<string, FieldSource>;
  // Existing names, offered as suggestions when editing.
  seriesNames: string[];
  peopleNames: string[];
};

const FORMAT_ORDER: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"];

type Person = { name: string } | null;

async function namesOf(supabase: SupabaseClient, table: "series" | "people") {
  const names: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("name").order("name").range(from, from + 999);
    if (error) throw new Error(error.message);
    names.push(...(data ?? []).map((r) => r.name as string));
    if ((data ?? []).length < 1000) return names;
  }
}

export async function loadBook(supabase: SupabaseClient, id: string): Promise<Book | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { data: t, error } = await supabase
    .from("titles")
    .select(
      `id, title, subtitle, read_status, book_type, is_reference, needs_check, check_note, description,
       romantic_subplot, spice, story_focus, vibe_main, vibe_second, series_id, series_number,
       series(id, name),
       reviews(rating),
       pieces(id, position, piece_title, kind, is_read),
       credits(role, position, people(name)),
       title_tags(source, confirmed, tags(kind, name)),
       copies(id, format, source, publisher, edition, edition_type, isbn13, isbn10, cover_url, cover_confirmed,
              pages, audio_minutes, est_words, contains_from, contains_to, bonus_notes, keepsake_notes,
              on_loan_to, credits(role, position, people(name)))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!t) return null;

  const copyIds = t.copies.map((c: { id: string }) => c.id);
  const { data: sourceRows, error: sourceError } = await supabase
    .from("field_sources")
    .select("entity_table, entity_id, field, source, confirmed")
    .in("entity_id", [t.id, ...copyIds]);
  if (sourceError) throw new Error(sourceError.message);
  const sourcesFor = (entityId: string) =>
    Object.fromEntries(
      (sourceRows ?? [])
        .filter((s) => s.entity_id === entityId)
        .map((s) => [s.field, { source: s.source, confirmed: s.confirmed }]),
    );

  let series: Book["series"] = null;
  const seriesRow = t.series as unknown as { id: string; name: string } | null;
  if (seriesRow) {
    const { data: siblings, error: siblingError } = await supabase
      .from("titles")
      .select("id, title, series_number, read_status, copies(format)")
      .eq("series_id", seriesRow.id);
    if (siblingError) throw new Error(siblingError.message);
    series = {
      id: seriesRow.id,
      name: seriesRow.name,
      number: t.series_number,
      books: (siblings ?? [])
        .map((s) => ({
          id: s.id,
          title: s.title,
          number: s.series_number,
          readStatus: s.read_status,
          formats: [...new Set((s.copies as { format: CopyFormat }[]).map((c) => c.format))],
        }))
        .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.title.localeCompare(b.title)),
    };
  }

  const credits = (t.credits as unknown as { role: string; position: number; people: Person }[])
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => (c.people ? [{ name: c.people.name, role: c.role }] : []));

  const [seriesNames, peopleNames] = await Promise.all([namesOf(supabase, "series"), namesOf(supabase, "people")]);

  return {
    seriesNames,
    peopleNames,
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    credits,
    series,
    readStatus: t.read_status,
    bookType: t.book_type,
    isReference: t.is_reference,
    needsCheck: t.needs_check,
    checkNote: t.check_note,
    description: t.description,
    romanticSubplot: t.romantic_subplot,
    spice: t.spice,
    storyFocus: t.story_focus,
    vibeMain: t.vibe_main,
    vibeSecond: t.vibe_second,
    rating: (t.reviews as unknown as { rating: number | null }[])[0]?.rating != null
      ? Number((t.reviews as unknown as { rating: number }[])[0].rating)
      : null,
    pieces: (t.pieces as unknown as { id: string; position: number; piece_title: string; kind: string; is_read: boolean }[])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, title: p.piece_title, kind: p.kind, isRead: p.is_read })),
    genres: (t.title_tags as unknown as { source: string; confirmed: boolean; tags: { kind: string; name: string } | null }[])
      .flatMap((tt) => (tt.tags ? [{ ...tt.tags, source: tt.source, confirmed: tt.confirmed }] : [])),
    copies: (t.copies as unknown as Record<string, unknown>[])
      .map((c) => ({
        id: c.id as string,
        format: c.format as CopyFormat,
        source: c.source as CopySource,
        publisher: c.publisher as string | null,
        edition: c.edition as string | null,
        editionType: c.edition_type as string | null,
        isbn13: c.isbn13 as string | null,
        isbn10: c.isbn10 as string | null,
        coverUrl: c.cover_url as string | null,
        coverConfirmed: c.cover_confirmed as boolean,
        pages: c.pages as number | null,
        audioMinutes: c.audio_minutes as number | null,
        estWords: c.est_words as number | null,
        containsFrom: c.contains_from as number | null,
        containsTo: c.contains_to as number | null,
        bonusNotes: c.bonus_notes as string | null,
        keepsakeNotes: c.keepsake_notes as string | null,
        onLoanTo: c.on_loan_to as string | null,
        narrators: (c.credits as { role: string; position: number; people: Person }[])
          .filter((cr) => cr.role === "narrator")
          .sort((a, b) => a.position - b.position)
          .flatMap((cr) => (cr.people ? [cr.people.name] : [])),
        sources: sourcesFor(c.id as string),
      }))
      .sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)),
    sources: sourcesFor(t.id),
  };
}
