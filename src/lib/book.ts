import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signCoverPaths } from "./covers";
import type { CopyFormat, CopySource } from "./library";
import type { Audience, ListTag, TagKind } from "./classification";
import type { Recommendation } from "./ratings";

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
  // "photo" when it's Alexandra's own photo, otherwise where the image is hosted.
  coverKind: "photo" | "openlibrary" | "other" | null;
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
  goneAt: string | null;
  goneReason: "sold" | "donated" | "gave_away" | "lost" | "other" | null;
  audioPerformance: number | null;
  audioNote: string | null;
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
  firstPublished: number | null;
  typicalPages: number | null;
  romanticSubplot: boolean | null;
  spice: string | null;
  storyFocus: string | null;
  vibeMain: string | null;
  vibeSecond: string | null;
  rating: number | null;
  writingQuality: number | null;
  recommendation: Recommendation | null;
  pieces: { id: string; title: string; kind: string; isRead: boolean }[];
  // Every list value on the book (genres, subgenres, tropes…), with its source.
  tags: { id: string; name: string; kind: TagKind; source: string; confirmed: boolean }[];
  audience: Audience | null;
  // Copies she owns now; ones she's parted with are in goneCopies.
  copies: BookCopy[];
  goneCopies: BookCopy[];
  sources: Record<string, FieldSource>;
  // Existing names, offered as suggestions when editing.
  seriesNames: string[];
  peopleNames: string[];
  // Every list, for the classification editor.
  lists: ListTag[];
};

const FORMAT_ORDER: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"];

type Person = { name: string } | null;

export async function namesOf(supabase: SupabaseClient, table: "series" | "people") {
  const names: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("name").order("name").range(from, from + 999);
    if (error) throw new Error(error.message);
    names.push(...(data ?? []).map((r) => r.name as string));
    if ((data ?? []).length < 1000) return names;
  }
}

// Every list value (not the rough genres), in list order, with its parents.
export async function loadLists(supabase: SupabaseClient): Promise<ListTag[]> {
  const [tags, parents] = await Promise.all([
    supabase.from("tags").select("id, kind, name, sort_order").neq("kind", "rough_genre").range(0, 4999),
    supabase.from("tag_parents").select("tag_id, parent_id").range(0, 9999),
  ]);
  if (tags.error) throw new Error(tags.error.message);
  if (parents.error) throw new Error(parents.error.message);
  const parentsOf = new Map<string, string[]>();
  for (const p of parents.data ?? []) parentsOf.set(p.tag_id, [...(parentsOf.get(p.tag_id) ?? []), p.parent_id]);
  return (tags.data ?? [])
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name))
    .map((t) => ({ id: t.id, kind: t.kind, name: t.name, parentIds: parentsOf.get(t.id) ?? [] }));
}

// shared: for the view-only link, which may not read loans, keepsake notes,
// why a copy left, or her private cover photos.
export async function loadBook(
  supabase: SupabaseClient,
  id: string,
  { shared = false }: { shared?: boolean } = {},
): Promise<Book | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const { data: t, error } = await supabase
    .from("titles")
    .select(
      `id, title, subtitle, read_status, book_type, is_reference, needs_check, check_note, description, audience,
       first_published, typical_pages,
       romantic_subplot, spice, story_focus, vibe_main, vibe_second, series_id, series_number,
       series(id, name),
       reviews(rating, writing_quality, recommendation),
       pieces(id, position, piece_title, kind, is_read),
       credits(role, position, people(name)),
       title_tags(source, confirmed, tags(id, kind, name)),
       copies(id, format, source, publisher, edition, edition_type, isbn13, isbn10, cover_url, cover_confirmed,
              pages, audio_minutes, est_words, contains_from, contains_to, bonus_notes, gone_at,
              ${shared ? "" : "cover_path, keepsake_notes, on_loan_to, gone_reason,"} credits(role, position, people(name)),
              reviews(audio_performance, body))`,
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
      .select("id, title, series_number, read_status, copies(format, gone_at)")
      .eq("series_id", seriesRow.id);
    if (siblingError) throw new Error(siblingError.message);
    series = {
      id: seriesRow.id,
      name: seriesRow.name,
      number: t.series_number,
      books: (siblings ?? [])
        .map((s) => ({ ...s, copies: (s.copies as { format: CopyFormat; gone_at: string | null }[]).filter((c) => !c.gone_at) }))
        .filter((s) => s.copies.length > 0 || s.id === t.id)
        .map((s) => ({
          id: s.id,
          title: s.title,
          number: s.series_number,
          readStatus: s.read_status,
          formats: [...new Set(s.copies.map((c) => c.format))],
        }))
        .sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.title.localeCompare(b.title)),
    };
  }

  const credits = (t.credits as unknown as { role: string; position: number; people: Person }[])
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => (c.people ? [{ name: c.people.name, role: c.role }] : []));

  const [seriesNames, peopleNames, lists, signed] = await Promise.all([
    namesOf(supabase, "series"),
    namesOf(supabase, "people"),
    loadLists(supabase),
    signCoverPaths(
      supabase,
      (t.copies as unknown as { cover_path: string | null }[]).flatMap((c) => (c.cover_path ? [c.cover_path] : [])),
    ),
  ]);

  const allCopies: BookCopy[] = (t.copies as unknown as Record<string, unknown>[])
    .map((c) => ({
      id: c.id as string,
      format: c.format as CopyFormat,
      source: c.source as CopySource,
      publisher: c.publisher as string | null,
      edition: c.edition as string | null,
      editionType: c.edition_type as string | null,
      isbn13: c.isbn13 as string | null,
      isbn10: c.isbn10 as string | null,
      coverUrl: c.cover_path ? (signed.get(c.cover_path as string) ?? null) : (c.cover_url as string | null),
      coverKind: (c.cover_path
        ? "photo"
        : !c.cover_url
          ? null
          : String(c.cover_url).startsWith("https://covers.openlibrary.org/")
            ? "openlibrary"
            : "other") as BookCopy["coverKind"],
      coverConfirmed: c.cover_confirmed as boolean,
      pages: c.pages as number | null,
      audioMinutes: c.audio_minutes as number | null,
      estWords: c.est_words as number | null,
      containsFrom: c.contains_from as number | null,
      containsTo: c.contains_to as number | null,
      bonusNotes: c.bonus_notes as string | null,
      keepsakeNotes: (c.keepsake_notes as string | null) ?? null,
      onLoanTo: (c.on_loan_to as string | null) ?? null,
      narrators: (c.credits as { role: string; position: number; people: Person }[])
        .filter((cr) => cr.role === "narrator")
        .sort((a, b) => a.position - b.position)
        .flatMap((cr) => (cr.people ? [cr.people.name] : [])),
      sources: sourcesFor(c.id as string),
      goneAt: c.gone_at as string | null,
      goneReason: (c.gone_reason as BookCopy["goneReason"]) ?? null,
      audioPerformance: (c.reviews as { audio_performance: number | null }[])[0]?.audio_performance ?? null,
      audioNote: (c.reviews as { body: string | null }[])[0]?.body ?? null,
    }))
    .sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format));

  const review = (
    t.reviews as unknown as { rating: number | null; writing_quality: number | null; recommendation: Recommendation | null }[]
  )[0];

  return {
    seriesNames,
    peopleNames,
    lists,
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
    firstPublished: t.first_published,
    typicalPages: t.typical_pages,
    romanticSubplot: t.romantic_subplot,
    spice: t.spice,
    storyFocus: t.story_focus,
    vibeMain: t.vibe_main,
    vibeSecond: t.vibe_second,
    rating: review?.rating != null ? Number(review.rating) : null,
    writingQuality: review?.writing_quality ?? null,
    recommendation: review?.recommendation ?? null,
    pieces: (t.pieces as unknown as { id: string; position: number; piece_title: string; kind: string; is_read: boolean }[])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, title: p.piece_title, kind: p.kind, isRead: p.is_read })),
    tags: (t.title_tags as unknown as { source: string; confirmed: boolean; tags: { id: string; kind: TagKind; name: string } | null }[])
      .flatMap((tt) => (tt.tags ? [{ ...tt.tags, source: tt.source, confirmed: tt.confirmed }] : [])),
    audience: t.audience,
    copies: allCopies.filter((c) => !c.goneAt),
    goneCopies: allCopies.filter((c) => c.goneAt),
    sources: sourcesFor(t.id),
  };
}
