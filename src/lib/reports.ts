import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseLookup, runLookup, type Answer, type Lookup } from "./ask";
import type { LibraryBook } from "./library";

export type PinnedReport = { id: string; name: string; question: string | null; lookup: Lookup; answer: Answer };

// Her pinned answers, each worked out again from today's books.
export async function loadPinned(supabase: SupabaseClient, books: LibraryBook[]): Promise<PinnedReport[]> {
  const { data, error } = await supabase
    .from("saved_reports")
    .select("id, name, question, spec")
    .eq("pinned", true)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((r) => {
    const lookup = parseLookup(r.spec);
    return lookup ? [{ id: r.id, name: r.name, question: r.question, lookup, answer: runLookup(books, lookup) }] : [];
  });
}
