import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUDIENCE, SPICE, STORY_FOCUS, VIBE, labelOf, type Audience, type Spice, type StoryFocus, type Vibe } from "@/lib/classification";
import { AUDIO, RECOMMEND, WRITING, find, starLabel, type Recommendation } from "@/lib/ratings";
import { ownerClient } from "@/lib/supabase/owner";

// "Download my library": a spreadsheet (one row per copy) or a full backup
// of every table as JSON. Only Alexandra can download; RLS limits the rows.

const TABLES = [
  "titles",
  "copies",
  "series",
  "people",
  "credits",
  "pieces",
  "author_identities",
  "character_representations",
  "tags",
  "title_tags",
  "reviews",
  "field_sources",
  "saved_reports",
  "tag_parents",
] as const;

type Row = Record<string, unknown>;

async function readAll(supabase: SupabaseClient, table: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

const FORMAT: Record<string, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market",
  print_unknown: "Print (type not set)",
  ebook: "Ebook",
  audiobook: "Audiobook",
};
const WHERE: Record<string, string> = { shelf: "Bookshelf", kobo: "Kobo", audible: "Audible", librofm: "Libro.fm", other: "Other" };
const STATUS: Record<string, string> = { read: "Read", partly_read: "Partly read", unread: "Unread" };
const BOOK_TYPE: Record<string, string> = {
  prose: "Prose",
  graphic_novel: "Graphic novel",
  manga: "Manga",
  comic_collection: "Comic collection",
  picture_book: "Picture book",
  poetry: "Poetry",
};

const GONE: Record<string, string> = { sold: "Sold", donated: "Donated", gave_away: "Gave away", lost: "Lost", other: "Other" };

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function spreadsheet(t: Record<(typeof TABLES)[number], Row[]>) {
  const people = new Map(t.people.map((p) => [p.id, p.name as string]));
  const series = new Map(t.series.map((s) => [s.id, s.name as string]));
  const tags = new Map(t.tags.map((g) => [g.id, g]));
  const authors = new Map<unknown, string[]>();
  for (const c of [...t.credits].sort((a, b) => Number(a.position) - Number(b.position))) {
    if (!c.title_id || c.role === "narrator") continue;
    authors.set(c.title_id, [...(authors.get(c.title_id) ?? []), people.get(c.person_id) ?? ""]);
  }
  const narrators = new Map<unknown, string[]>();
  for (const c of t.credits) {
    if (c.role === "narrator" && c.copy_id) narrators.set(c.copy_id, [...(narrators.get(c.copy_id) ?? []), people.get(c.person_id) ?? ""]);
  }
  // List values per book, by kind (genre, subgenre, trope…).
  const listed = new Map<unknown, Map<string, string[]>>();
  for (const tt of t.title_tags) {
    const g = tags.get(tt.tag_id);
    if (!g) continue;
    const m = listed.get(tt.title_id) ?? new Map<string, string[]>();
    m.set(g.kind as string, [...(m.get(g.kind as string) ?? []), g.name as string]);
    listed.set(tt.title_id, m);
  }
  const ofKind = (titleId: unknown, ...kinds: string[]) =>
    kinds.flatMap((k) => listed.get(titleId)?.get(k) ?? []).join("; ");
  const reviews = new Map(t.reviews.filter((r) => r.title_id).map((r) => [r.title_id, r]));
  const copyReviews = new Map(t.reviews.filter((r) => r.copy_id).map((r) => [r.copy_id, r]));
  const copies = new Map<unknown, Row[]>();
  for (const c of t.copies) copies.set(c.title_id, [...(copies.get(c.title_id) ?? []), c]);

  const header = [
    "Title", "Authors", "Series", "Series #", "Read status", "Stars", "Stars label", "Writing quality",
    "Recommend", "Book type", "Reference",
    "Needs checking", "Genres", "Subgenres", "Tropes", "Audience", "Vibe", "Romantic subplot", "Spice",
    "Story focus", "Subjects", "Reasons for reading", "Rough genre (photos)", "Format", "Where it lives", "Edition", "Publisher", "ISBN",
    "Narrators", "Audio performance", "Narration note", "On loan to", "Keepsake notes", "Gone",
  ];
  const lines = [header.map(csvCell).join(",")];
  const titles = [...t.titles].sort((a, b) => String(a.title).localeCompare(String(b.title)));
  for (const title of titles) {
    const review = reviews.get(title.id);
    for (const c of copies.get(title.id) ?? [{}]) {
      lines.push(
        [
          title.title,
          (authors.get(title.id) ?? []).join("; "),
          series.get(title.series_id) ?? "",
          title.series_number ?? "",
          STATUS[title.read_status as string] ?? title.read_status,
          review?.rating != null ? Number(review.rating).toFixed(2) : "",
          starLabel(review?.rating != null ? Number(review.rating) : null) ?? "",
          review?.writing_quality ? `${review.writing_quality} ${find(WRITING, Number(review.writing_quality))?.label}` : "",
          find(RECOMMEND, review?.recommendation as Recommendation)?.label ?? "",
          BOOK_TYPE[title.book_type as string] ?? title.book_type,
          title.is_reference ? "Yes" : "",
          title.needs_check ? "Yes" : "",
          ofKind(title.id, "genre"),
          ofKind(title.id, "subgenre", "supernatural_being", "shifter_type", "queer_romance_type", "retelling_type"),
          ofKind(title.id, "trope"),
          labelOf(AUDIENCE, title.audience as Audience) ?? "",
          [labelOf(VIBE, title.vibe_main as Vibe), labelOf(VIBE, title.vibe_second as Vibe)].filter(Boolean).join(", then "),
          title.romantic_subplot == null ? "" : title.romantic_subplot ? "Yes" : "No",
          labelOf(SPICE, title.spice as Spice) ?? "",
          labelOf(STORY_FOCUS, title.story_focus as StoryFocus) ?? "",
          ofKind(title.id, "subject"),
          ofKind(title.id, "reason"),
          ofKind(title.id, "rough_genre"),
          FORMAT[c.format as string] ?? "",
          WHERE[c.source as string] ?? "",
          c.edition ?? "",
          c.publisher ?? "",
          c.isbn13 ?? c.isbn10 ?? "",
          (narrators.get(c.id) ?? []).join("; "),
          copyReviews.get(c.id)?.audio_performance
            ? `${copyReviews.get(c.id)!.audio_performance} ${find(AUDIO, Number(copyReviews.get(c.id)!.audio_performance))?.label}`
            : "",
          copyReviews.get(c.id)?.body ?? "",
          c.on_loan_to ?? "",
          c.keepsake_notes ?? "",
          c.gone_at ? `${GONE[c.gone_reason as string] ?? c.gone_reason} ${String(c.gone_at).slice(0, 10)}` : "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  // The byte-order mark makes Excel and Numbers read accents correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function GET(request: NextRequest) {
  let supabase: SupabaseClient;
  try {
    ({ supabase } = await ownerClient());
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const tables = Object.fromEntries(
    await Promise.all(TABLES.map(async (name) => [name, await readAll(supabase, name)] as const)),
  ) as Record<(typeof TABLES)[number], Row[]>;

  const date = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };

  if (request.nextUrl.searchParams.get("format") === "json") {
    const body = JSON.stringify({ exported_at: new Date().toISOString(), app: "Home Library", tables }, null, 1);
    return new NextResponse(body, {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="home-library-backup-${date}.json"`,
      },
    });
  }

  return new NextResponse(spreadsheet(tables), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="home-library-${date}.csv"`,
    },
  });
}
