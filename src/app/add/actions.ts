"use server";

import { findDetails, googleBooksKey } from "@/lib/book-details";
import { fold } from "@/lib/library-filters";
import { ownerClient } from "@/lib/supabase/owner";

// Looks a book up on Open Library (and Google Books for anything missing)
// while Alexandra fills in the Add form. Nothing is saved here: the values go
// into the form, labelled with where they came from, for her to keep or clear.

export type LookedSource = "openlibrary" | "googlebooks";
export type LookedField = "description" | "first_published" | "typical_pages" | "series" | "series_number" | "publisher" | "pages";
export type Looked = {
  fields: Partial<Record<LookedField, { value: string | number; source: LookedSource }>>;
  openlibraryKey?: string;
};

const seriesKey = (s: string) => fold(s).replace(/^the\s+/, "").replace(/\s+series$/, "").trim();

export async function lookupDetails(input: {
  title: string;
  authors: string[];
  isbn13: string | null;
  format: string;
}): Promise<{ ok: true; looked: Looked } | { ok: false; error: string }> {
  try {
    const { title, authors, isbn13, format } = input;
    if (
      typeof title !== "string" || title.length > 300 ||
      !Array.isArray(authors) || authors.length > 20 || !authors.every((a) => typeof a === "string" && a.length <= 200) ||
      (isbn13 !== null && !/^97[89]\d{10}$/.test(isbn13)) ||
      typeof format !== "string"
    ) {
      throw new Error("That request isn't valid.");
    }
    const { supabase } = await ownerClient();
    const copies = isbn13 && format !== "audiobook" ? [{ id: "new", format, isbn13, pages: null }] : [];
    const found = await findDetails({ title: title.trim(), authors: authors.map((a) => a.trim()).filter(Boolean), copies }, googleBooksKey());

    const looked: Looked = { fields: {} };
    for (const t of found.titles) {
      const put = (field: LookedField, value: string | number | undefined) => {
        if (value !== undefined && value !== "" && !looked.fields[field]) looked.fields[field] = { value, source: t.source };
      };
      put("description", t.description);
      put("first_published", t.first_published);
      put("typical_pages", t.typical_pages);
      if (t.series && !looked.fields.series) {
        put("series", t.series);
        put("series_number", t.series_number);
      }
      looked.openlibraryKey ??= t.openlibrary_key;
    }
    const copy = found.copies[0];
    if (copy?.publisher) looked.fields.publisher = { value: copy.publisher, source: "openlibrary" };
    if (copy?.pages) looked.fields.pages = { value: copy.pages, source: "openlibrary" };

    // Use her spelling of a series she already has ("Immortals After Dark",
    // not "The Immortals After Dark Series").
    const series = looked.fields.series;
    if (series) {
      const { data } = await supabase.from("series").select("name").range(0, 4999);
      const mine = (data ?? []).find((s) => seriesKey(s.name) === seriesKey(String(series.value)));
      if (mine) series.value = mine.name;
    }
    return { ok: true, looked };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't look that book up." };
  }
}
