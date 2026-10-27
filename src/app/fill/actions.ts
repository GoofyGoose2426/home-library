"use server";

import { revalidatePath } from "next/cache";
import { findDetails, googleBooksKey, testGoogleBooks } from "@/lib/book-details";
import { fold } from "@/lib/library-filters";
import { ownerClient } from "@/lib/supabase/owner";

// Fills in details for a few books at a time; the Fill in page calls this in
// a loop so a long run can be paused and picked up later.

const UUID = /^[0-9a-f-]{36}$/i;
const LABEL: Record<string, string> = {
  description: "description",
  first_published: "year",
  typical_pages: "length",
  series: "series",
  publisher: "publisher",
  pages: "pages",
  est_words: "word estimate",
};

export type FillResult = {
  id: string;
  title: string;
  source: "openlibrary" | "googlebooks" | "both" | null;
  filled: string[];
  // Why a book couldn't be checked this time (it stays on the to-do list).
  note?: string;
};

const seriesKey = (s: string) => fold(s).replace(/^the\s+/, "").replace(/\s+series$/, "").trim();

export async function fillBookDetails(
  titleIds: string[],
): Promise<{ ok: true; results: FillResult[]; googleError?: string } | { ok: false; error: string }> {
  try {
    if (!Array.isArray(titleIds) || titleIds.length > 5 || !titleIds.every((id) => UUID.test(id))) {
      throw new Error("That request isn't valid.");
    }
    const { supabase } = await ownerClient();
    const [{ data: titles, error }, { data: series, error: seriesError }] = await Promise.all([
      supabase
        .from("titles")
        .select("id, title, credits(role, position, people(name)), copies(id, format, isbn13, pages, gone_at)")
        .in("id", titleIds),
      supabase.from("series").select("name").range(0, 4999),
    ]);
    if (error) throw new Error(error.message);
    if (seriesError) throw new Error(seriesError.message);
    // Use her spelling of a series she already has ("Immortals After Dark",
    // not "The Immortals After Dark Series").
    const known = new Map((series ?? []).map((s) => [seriesKey(s.name), s.name as string]));

    const results: FillResult[] = [];
    let googleError: string | undefined;
    for (const t of titles ?? []) {
      const authors = (t.credits as unknown as { role: string; position: number; people: { name: string } | null }[])
        .filter((c) => c.role !== "narrator" && c.people)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.people!.name);
      const copies = (t.copies as { id: string; format: string; isbn13: string | null; pages: number | null; gone_at: string | null }[])
        .filter((c) => !c.gone_at);
      let found;
      try {
        found = await findDetails({ title: t.title, authors, copies }, googleBooksKey());
      } catch {
        // Open Library was too slow or down. Leave the book unchecked so a
        // later run picks it up, and carry on with the next one.
        results.push({ id: t.id, title: t.title, source: null, filled: [], note: "Open Library didn't answer. It'll be checked next time." });
        continue;
      }
      googleError ??= found.googleError;

      const filled = new Set<string>();
      const parts = found.titles.length ? found.titles : [{ source: null }];
      for (const [i, part] of parts.entries()) {
        const p = { ...part } as Record<string, unknown>;
        if (typeof p.series === "string") p.series = known.get(seriesKey(p.series)) ?? p.series;
        const { data, error: fillError } = await supabase.rpc("apply_book_details", {
          p_title_id: t.id,
          p_title: p,
          p_copies: i === 0 ? found.copies : [],
        });
        if (fillError) throw new Error(fillError.message);
        for (const f of (data as string[]) ?? []) filled.add(LABEL[f] ?? f);
      }
      const sources = new Set(found.titles.map((x) => x.source));
      results.push({
        id: t.id,
        title: t.title,
        source: sources.size === 2 ? "both" : ([...sources][0] ?? null),
        filled: [...filled],
      });
    }
    revalidatePath("/");
    if (results.length && results.every((r) => r.note)) {
      return { ok: false, error: "Open Library isn't answering right now. Tap Carry on in a few minutes; nothing is lost." };
    }
    return { ok: true, results, googleError };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't fill in those books." };
  }
}

// One test search, to see whether Google Books accepts the key.
export async function checkGoogleBooks(): Promise<{ ok: boolean; message: string }> {
  try {
    await ownerClient();
    const key = googleBooksKey();
    if (!key) return { ok: false, message: "There's no Google Books key in Vercel yet." };
    const n = await testGoogleBooks(key);
    return { ok: true, message: `Google Books is working (${n.toLocaleString()} results for a test search).` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Google Books didn't answer." };
  }
}
