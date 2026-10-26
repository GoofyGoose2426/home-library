"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownerClient } from "@/lib/supabase/owner";
import type { GoneReason } from "@/lib/gone";
import { isQuarterStar } from "@/lib/ratings";

// Quick edits. Each one records Alexandra as the source of the value, which
// stops any later prefill from overwriting it (see field_sources_protect).

const UUID = /^[0-9a-f-]{36}$/i;
const PRINT_TYPES = ["hardcover", "trade_paperback", "mass_market", "print_unknown"] as const;
type PrintType = (typeof PRINT_TYPES)[number];

function check(ok: boolean, message = "That change isn't valid.") {
  if (!ok) throw new Error(message);
}

async function must(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) throw new Error(error.message);
}

async function markMine(supabase: SupabaseClient, table: "titles" | "copies", ids: string[], field: string) {
  if (!ids.length) return;
  await must(
    supabase.from("field_sources").upsert(
      ids.map((id) => ({ entity_table: table, entity_id: id, field, source: "alexandra", confirmed: true })),
      { onConflict: "entity_table,entity_id,field" },
    ),
  );
}

function refresh(titleId?: string) {
  revalidatePath("/");
  if (titleId) revalidatePath(`/books/${titleId}`);
}

async function titleOfCopy(supabase: SupabaseClient, copyId: string) {
  const { data, error } = await supabase.from("copies").select("title_id").eq("id", copyId).maybeSingle();
  if (error) throw new Error(error.message);
  check(!!data, "That copy wasn't found.");
  return data!.title_id as string;
}

export async function setReadStatus(titleId: string, status: "read" | "unread") {
  check(UUID.test(titleId) && (status === "read" || status === "unread"));
  const { supabase } = await ownerClient();
  const { count, error } = await supabase
    .from("pieces")
    .select("id", { count: "exact", head: true })
    .eq("title_id", titleId);
  if (error) throw new Error(error.message);
  check(!count, "This is a collection: tick its pieces instead.");
  await must(supabase.from("titles").update({ read_status: status }).eq("id", titleId));
  await markMine(supabase, "titles", [titleId], "read_status");
  refresh(titleId);
}

export async function setRating(titleId: string, rating: number | null) {
  check(UUID.test(titleId) && (rating === null || isQuarterStar(rating)));
  const { supabase } = await ownerClient();
  const { data: existing, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("title_id", titleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) {
    await must(supabase.from("reviews").update({ rating }).eq("id", existing.id));
  } else if (rating !== null) {
    await must(supabase.from("reviews").insert({ title_id: titleId, rating }));
  }
  refresh(titleId);
}

export async function setReference(titleId: string, isReference: boolean) {
  check(UUID.test(titleId) && typeof isReference === "boolean");
  const { supabase } = await ownerClient();
  await must(supabase.from("titles").update({ is_reference: isReference }).eq("id", titleId));
  await markMine(supabase, "titles", [titleId], "is_reference");
  refresh(titleId);
}

export async function setLoan(copyId: string, name: string | null) {
  const value = name?.trim() || null;
  check(UUID.test(copyId) && (value === null || value.length <= 80));
  const { supabase } = await ownerClient();
  await must(supabase.from("copies").update({ on_loan_to: value }).eq("id", copyId));
  await markMine(supabase, "copies", [copyId], "on_loan_to");
  refresh(await titleOfCopy(supabase, copyId));
}

export async function setKeepsake(copyId: string, notes: string | null) {
  const value = notes?.trim() || null;
  check(UUID.test(copyId) && (value === null || value.length <= 1000));
  const { supabase } = await ownerClient();
  await must(supabase.from("copies").update({ keepsake_notes: value }).eq("id", copyId));
  await markMine(supabase, "copies", [copyId], "keepsake_notes");
  refresh(await titleOfCopy(supabase, copyId));
}

const CREDIT_ROLES = ["author", "writer", "artist", "editor", "translator"] as const;
const BOOK_TYPES = ["prose", "graphic_novel", "manga", "comic_collection", "picture_book", "poetry"] as const;

export type DetailsInput = {
  title: string;
  subtitle: string;
  bookType: (typeof BOOK_TYPES)[number];
  series: string;
  seriesNumber: number | null;
  credits: { name: string; role: (typeof CREDIT_ROLES)[number] }[];
  narrators: { copyId: string; names: string[] }[];
  clearCheck: boolean;
};

// Saves a book's own details in one all-or-nothing database call. Returns
// the problem as text, because thrown errors are hidden in production.
export async function saveDetails(titleId: string, d: DetailsInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveDetailsOrThrow(titleId, d);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the details." };
  }
}

async function saveDetailsOrThrow(titleId: string, d: DetailsInput) {
  const short = (s: unknown, max: number) => typeof s === "string" && s.length <= max;
  check(
    UUID.test(titleId) &&
      short(d.title, 300) && d.title.trim().length > 0 &&
      short(d.subtitle, 300) && short(d.series, 200) &&
      BOOK_TYPES.includes(d.bookType) &&
      (d.seriesNumber === null || (Number.isFinite(d.seriesNumber) && d.seriesNumber >= 0 && d.seriesNumber < 10000)) &&
      Array.isArray(d.credits) && d.credits.length <= 50 &&
      d.credits.every((c) => short(c.name, 200) && CREDIT_ROLES.includes(c.role)) &&
      Array.isArray(d.narrators) && d.narrators.length <= 10 &&
      d.narrators.every((n) => UUID.test(n.copyId) && Array.isArray(n.names) && n.names.length <= 20 && n.names.every((x) => short(x, 200))) &&
      typeof d.clearCheck === "boolean",
  );
  const { supabase } = await ownerClient();
  const { error } = await supabase.rpc("save_title_details", {
    p_title_id: titleId,
    p_title: d.title,
    p_subtitle: d.subtitle,
    p_book_type: d.bookType,
    p_series: d.series,
    p_series_number: d.series.trim() ? d.seriesNumber : null,
    p_credits: d.credits,
    p_narrators: d.narrators.map((n) => ({ copy_id: n.copyId, names: n.names })),
    p_clear_check: d.clearCheck,
  });
  if (error) throw new Error(error.message);
  refresh(titleId);
}

// Sets the print type on print copies only; ebooks and audiobooks are left alone.
export async function setPrintType(copyIds: string[], format: PrintType) {
  check(
    copyIds.length > 0 && copyIds.length <= 500 && copyIds.every((id) => UUID.test(id)) && PRINT_TYPES.includes(format),
  );
  const { supabase } = await ownerClient();
  const { data, error } = await supabase
    .from("copies")
    .update({ format })
    .in("id", copyIds)
    .in("format", PRINT_TYPES)
    .select("id, title_id");
  if (error) throw new Error(error.message);
  await markMine(supabase, "copies", (data ?? []).map((c) => c.id), "format");
  refresh();
  for (const t of new Set((data ?? []).map((c) => c.title_id as string))) revalidatePath(`/books/${t}`);
  return (data ?? []).length;
}

// Ticks a story, essay or poem in a collection. The collection is Read when
// every piece is ticked, Partly read when some are, Unread when none are.
export async function setPieceRead(pieceId: string, isRead: boolean) {
  check(UUID.test(pieceId) && typeof isRead === "boolean");
  const { supabase } = await ownerClient();
  const { data: piece, error } = await supabase
    .from("pieces")
    .update({ is_read: isRead })
    .eq("id", pieceId)
    .select("title_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  check(!!piece, "That piece wasn't found.");
  const { data: all, error: allError } = await supabase.from("pieces").select("is_read").eq("title_id", piece!.title_id);
  if (allError) throw new Error(allError.message);
  const done = (all ?? []).filter((p) => p.is_read).length;
  const status = done === 0 ? "unread" : done === (all ?? []).length ? "read" : "partly_read";
  await must(supabase.from("titles").update({ read_status: status }).eq("id", piece!.title_id));
  await markMine(supabase, "titles", [piece!.title_id], "read_status");
  refresh(piece!.title_id);
  return status;
}

// ---------------------------------------------------------------------------
// Covers, per copy. Each choice is marked as Alexandra's, so the cover finder
// never replaces it. A photo she replaces or removes is deleted from storage.

type Result = { ok: true } | { ok: false; error: string };

async function asResult(work: () => Promise<void>): Promise<Result> {
  try {
    await work();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the cover." };
  }
}

async function replaceCover(copyId: string, cover: { cover_url: string | null; cover_path: string | null; confirmed: boolean }) {
  const { supabase } = await ownerClient();
  const { data: before, error } = await supabase
    .from("copies")
    .select("title_id, cover_path")
    .eq("id", copyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  check(!!before, "That copy wasn't found.");
  await must(
    supabase
      .from("copies")
      .update({ cover_url: cover.cover_url, cover_path: cover.cover_path, cover_confirmed: cover.confirmed })
      .eq("id", copyId),
  );
  await markMine(supabase, "copies", [copyId], "cover_url");
  if (before!.cover_path && before!.cover_path !== cover.cover_path) {
    await supabase.storage.from("covers").remove([before!.cover_path as string]);
  }
  refresh(before!.title_id as string);
}

// A cover chosen from Open Library's images (by its cover number).
export async function setCoverFromOpenLibrary(copyId: string, coverId: number): Promise<Result> {
  return asResult(async () => {
    check(UUID.test(copyId) && Number.isInteger(coverId) && coverId > 0 && coverId < 1e10);
    await replaceCover(copyId, {
      cover_url: `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`,
      cover_path: null,
      confirmed: true,
    });
  });
}

// A photo she uploaded to her own folder: <her id>/<copy id>/<time>.jpg
export async function setCoverPhoto(copyId: string, path: string): Promise<Result> {
  return asResult(async () => {
    const { ownerId } = await ownerClient();
    check(
      UUID.test(copyId) && new RegExp(`^${ownerId}/${copyId}/\\d{10,16}\\.jpg$`).test(path),
      "That photo wasn't saved in the right place.",
    );
    await replaceCover(copyId, { cover_url: null, cover_path: path, confirmed: true });
  });
}

export async function removeCopyCover(copyId: string): Promise<Result> {
  return asResult(async () => {
    check(UUID.test(copyId));
    await replaceCover(copyId, { cover_url: null, cover_path: null, confirmed: false });
  });
}

// ---------------------------------------------------------------------------
// Adding books and copies (one all-or-nothing database call).

const FORMATS = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"] as const;
const SOURCES = ["shelf", "kobo", "audible", "librofm", "other"] as const;

export type NewCopy = {
  format: (typeof FORMATS)[number];
  source: (typeof SOURCES)[number];
  isbn13: string;
  publisher: string;
  pages: number | null;
  coverUrl: string;
  onLoanTo: string;
  narrators: string[];
};

export type NewBook = {
  title: string;
  subtitle: string;
  bookType: DetailsInput["bookType"];
  readStatus: "read" | "unread";
  series: string;
  seriesNumber: number | null;
  credits: DetailsInput["credits"];
};

// Adds a new book with its first copy, or (with titleId) a copy of a book
// she already has. Returns the book's id to open its page.
export async function addBook(
  titleId: string | null,
  book: NewBook | null,
  copy: NewCopy,
): Promise<{ ok: true; titleId: string } | { ok: false; error: string }> {
  try {
    const short = (s: unknown, max: number) => typeof s === "string" && s.length <= max;
    check(
      FORMATS.includes(copy.format) &&
        SOURCES.includes(copy.source) &&
        (copy.isbn13 === "" || /^97[89]\d{10}$/.test(copy.isbn13)) &&
        short(copy.publisher, 200) &&
        (copy.pages === null || (Number.isInteger(copy.pages) && copy.pages > 0 && copy.pages < 20000)) &&
        (copy.coverUrl === "" || /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-[SML]\.jpg$/.test(copy.coverUrl)) &&
        short(copy.onLoanTo, 80) &&
        Array.isArray(copy.narrators) && copy.narrators.length <= 20 && copy.narrators.every((n) => short(n, 200)),
      "Some of the copy's details aren't valid. Check the ISBN (13 digits) and page count.",
    );
    if (titleId) {
      check(UUID.test(titleId));
    } else {
      check(
        !!book &&
          short(book.title, 300) && book.title.trim().length > 0 &&
          short(book.subtitle, 300) && short(book.series, 200) &&
          ["read", "unread"].includes(book.readStatus) &&
          BOOK_TYPES.includes(book.bookType) &&
          (book.seriesNumber === null || (Number.isFinite(book.seriesNumber) && book.seriesNumber >= 0 && book.seriesNumber < 10000)) &&
          Array.isArray(book.credits) && book.credits.length <= 50 &&
          book.credits.every((c) => short(c.name, 200) && CREDIT_ROLES.includes(c.role)),
        "A title is required.",
      );
    }
    const { supabase } = await ownerClient();
    const { data, error } = await supabase.rpc("add_book", {
      p_title_id: titleId,
      p_book: book && {
        title: book.title,
        subtitle: book.subtitle,
        book_type: book.bookType,
        read_status: book.readStatus,
        series: book.series,
        series_number: book.series.trim() ? book.seriesNumber : null,
        credits: book.credits.filter((c) => c.name.trim()),
      },
      p_copy: {
        format: copy.format,
        source: copy.source,
        isbn13: copy.isbn13,
        publisher: copy.publisher,
        pages: copy.pages,
        cover_url: copy.coverUrl,
        on_loan_to: copy.onLoanTo,
        narrators: copy.narrators,
      },
    });
    if (error) {
      throw new Error(/copies_isbn13_key/.test(error.message) ? "A copy with that ISBN is already in your library." : error.message);
    }
    refresh(data as string);
    return { ok: true, titleId: data as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't add the book." };
  }
}

// ---------------------------------------------------------------------------
// Removing copies. "No longer own" moves a copy to the Gone list (with Undo);
// "Added by mistake" deletes it for good, and the book too if it was the last.

const GONE_REASONS: GoneReason[] = ["sold", "donated", "gave_away", "lost", "other"];

async function setGone(copyId: string, reason: GoneReason | null): Promise<Result> {
  try {
    check(UUID.test(copyId) && (reason === null || GONE_REASONS.includes(reason)));
    const { supabase } = await ownerClient();
    const titleId = await titleOfCopy(supabase, copyId);
    await must(
      supabase
        .from("copies")
        .update({ gone_at: reason ? new Date().toISOString() : null, gone_reason: reason })
        .eq("id", copyId),
    );
    refresh(titleId);
    revalidatePath("/gone");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save that." };
  }
}

export async function markCopyGone(copyId: string, reason: GoneReason) {
  return setGone(copyId, reason);
}

export async function undoCopyGone(copyId: string) {
  return setGone(copyId, null);
}

export async function deleteCopy(
  copyId: string,
): Promise<{ ok: true; titleDeleted: boolean } | { ok: false; error: string }> {
  try {
    check(UUID.test(copyId));
    const { supabase } = await ownerClient();
    const titleId = await titleOfCopy(supabase, copyId);
    const { data, error } = await supabase.rpc("delete_copy", { p_copy_id: copyId });
    if (error) throw new Error(error.message);
    const row = (data as { cover_path: string | null; title_deleted: boolean }[])[0];
    if (row?.cover_path) await supabase.storage.from("covers").remove([row.cover_path]);
    refresh(titleId);
    revalidatePath("/gone");
    return { ok: true, titleDeleted: !!row?.title_deleted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't remove that copy." };
  }
}
