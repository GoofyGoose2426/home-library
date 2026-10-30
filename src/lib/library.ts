import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signCoverPaths } from "./covers";
import { AUDIENCE, SPICE, STORY_FOCUS, VIBE, labelOf, type Audience, type Spice, type StoryFocus, type Vibe } from "./classification";
import type { Recommendation } from "./ratings";
import { AUTHOR_FACET, CATEGORIES, CHARACTER_FACET, UNKNOWN, type IdentityCategory } from "./representation";

export type CopySource = "shelf" | "kobo" | "audible" | "librofm" | "other";

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
  copies: {
    id: string;
    format: CopyFormat;
    source: CopySource;
    onLoanTo: string | null;
    keepsakeNotes: string | null;
    audioPerformance: number | null;
    audioNote: string | null;
  }[];
  rating: number | null;
  writingQuality: number | null;
  recommendation: Recommendation | null;
  // The best narration score among its audiobook copies.
  audioPerformance: number | null;
  pieceCount: number;
  // False when every copy is on the Gone list (only loaded with includeGone).
  owned: boolean;
  onLoanTo: string[];
  sources: string[];
  // Classification values per filter group (see FACETS), as labels.
  facets: Record<string, string[]>;
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
  credits: {
    role: string;
    position: number;
    people: { name: string; author_identities: { category: IdentityCategory; value: string }[] } | null;
  }[];
  character_representations: { category: IdentityCategory; value: string }[];
  own_voices: boolean | null;
  title_tags: { tags: { kind: string; name: string } | null }[];
  audience: Audience | null;
  romantic_subplot: boolean | null;
  spice: Spice | null;
  story_focus: StoryFocus | null;
  vibe_main: Vibe | null;
  vibe_second: Vibe | null;
  reviews: { rating: number | null; writing_quality: number | null; recommendation: Recommendation | null }[];
  pieces: { count: number }[];
  copies: {
    id: string;
    format: CopyFormat;
    source: CopySource;
    // Not read for the view-only link.
    keepsake_notes?: string | null;
    cover_url: string | null;
    cover_path?: string | null;
    cover_confirmed: boolean;
    on_loan_to?: string | null;
    gone_at: string | null;
    reviews: { audio_performance: number | null; body: string | null }[];
  }[];
};

function facetsOf(t: Row): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  const add = (key: string, value: string | null) => {
    if (value) f[key] = [...(f[key] ?? []), value];
  };
  for (const tt of t.title_tags) if (tt.tags) add(tt.tags.kind, tt.tags.name);
  add("audience", labelOf(AUDIENCE, t.audience));
  add("vibe", labelOf(VIBE, t.vibe_main));
  add("vibe", labelOf(VIBE, t.vibe_second));
  add("romantic_subplot", t.romantic_subplot == null ? null : t.romantic_subplot ? "Yes" : "No");
  add("spice", labelOf(SPICE, t.spice));
  add("story_focus", labelOf(STORY_FOCUS, t.story_focus));
  // Representation: every writing credit's own words ("Unknown" when none of
  // them has said), the main characters, and own voices.
  const writers = t.credits.filter((c) => c.role !== "narrator" && c.people);
  for (const { key } of CATEGORIES) {
    const values = new Set(writers.flatMap((c) => c.people!.author_identities.filter((i) => i.category === key).map((i) => i.value)));
    if (writers.length) for (const v of values.size ? values : [UNKNOWN]) add(AUTHOR_FACET(key), v);
  }
  for (const r of t.character_representations) add(CHARACTER_FACET(r.category), r.value);
  add("own_voices", t.own_voices == null ? null : t.own_voices ? "Yes" : "No");
  return f;
}

const FORMAT_ORDER: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"];

// Every title Alexandra owns, with what the grid and table show. Copies on the
// Gone list are left out, and so are books with no owned copies, unless
// includeGone (used by Add, to recognise a book she's had before). RLS limits
// this to her rows; PostgREST returns at most 1,000 rows, so read in pages.
// shared: for the view-only link, which may not read loans, keepsake notes
// or her private cover photos.
export async function loadLibrary(
  supabase: SupabaseClient,
  { includeGone = false, shared = false }: { includeGone?: boolean; shared?: boolean } = {},
): Promise<LibraryBook[]> {
  const copyColumns = shared
    ? "id, format, source, cover_url, cover_confirmed, gone_at"
    : "id, format, source, keepsake_notes, cover_url, cover_path, cover_confirmed, on_loan_to, gone_at";
  const books: LibraryBook[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("titles")
      .select(
        `id, title, read_status, book_type, is_reference, needs_check, series_number,
         audience, romantic_subplot, spice, story_focus, vibe_main, vibe_second,
         series(name),
         own_voices,
         credits(role, position, people(name, author_identities(category, value))),
         character_representations(category, value),
         title_tags(tags(kind, name)),
         reviews(rating, writing_quality, recommendation),
         pieces(count),
         copies(${copyColumns}, reviews(audio_performance, body))`,
      )
      .order("title")
      .range(from, from + 999)
      .returns<Row[]>();
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const ownedCopies = row.copies.filter((c) => !c.gone_at);
      if (!ownedCopies.length && !includeGone) continue;
      const t = { ...row, copies: ownedCopies };
      const cover = t.copies.find((c) => c.cover_path) ?? t.copies.find((c) => c.cover_url);
      books.push({
        id: t.id,
        title: t.title,
        authors: t.credits
          .filter((c) => c.role !== "narrator")
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
        copies: t.copies
          .map((c) => ({
            id: c.id,
            format: c.format,
            source: c.source,
            onLoanTo: c.on_loan_to ?? null,
            keepsakeNotes: c.keepsake_notes ?? null,
            audioPerformance: c.reviews[0]?.audio_performance ?? null,
            audioNote: c.reviews[0]?.body ?? null,
          }))
          .sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)),
        onLoanTo: t.copies.flatMap((c) => (c.on_loan_to ? [c.on_loan_to] : [])),
        sources: [...new Set(t.copies.map((c) => c.source))],
        facets: facetsOf(t),
        hasKeepsake: t.copies.some((c) => !!c.keepsake_notes?.trim()),
        rating: t.reviews[0]?.rating != null ? Number(t.reviews[0].rating) : null,
        writingQuality: t.reviews[0]?.writing_quality ?? null,
        recommendation: t.reviews[0]?.recommendation ?? null,
        audioPerformance:
          Math.max(0, ...t.copies.flatMap((c) => (c.reviews[0]?.audio_performance ? [c.reviews[0].audio_performance] : []))) || null,
        pieceCount: t.pieces[0]?.count ?? 0,
        owned: ownedCopies.length > 0,
        coverUrl: cover?.cover_path ? `photo:${cover.cover_path}` : (cover?.cover_url ?? null),
        coverConfirmed: cover?.cover_path ? true : (cover?.cover_confirmed ?? false),
      });
    }
    if ((data ?? []).length < 1000) break;
  }
  const signed = await signCoverPaths(
    supabase,
    books.flatMap((b) => (b.coverUrl?.startsWith("photo:") ? [b.coverUrl.slice(6)] : [])),
  );
  for (const b of books) {
    if (b.coverUrl?.startsWith("photo:")) b.coverUrl = signed.get(b.coverUrl.slice(6)) ?? null;
  }
  return books;
}
