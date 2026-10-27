import { Suspense } from "react";
import Link from "next/link";
import { fold } from "@/lib/library-filters";
import { createClient } from "@/lib/supabase/server";
import { SeriesRow, type SeriesRowBook } from "./series-row";

export const metadata = { title: "Series check · Home Library" };

export default function SeriesCheckPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Series check</h1>
      <p className="mt-2 text-muted">
        Books by authors who write series, that aren&apos;t in one yet, and series books with no number. Pick the series
        (or <strong className="font-medium text-foreground">Not in a series</strong>) and its number, then save. Saved
        books leave this list.
      </p>
      <Suspense fallback={<p className="mt-6 text-muted">Checking your series…</p>}>
        <Lists />
      </Suspense>
    </main>
  );
}

type Row = {
  id: string;
  title: string;
  series_number: number | null;
  series: { name: string } | null;
  credits: { role: string; people: { name: string } | null }[];
  copies: { gone_at: string | null }[];
};

const seriesKey = (s: string) => fold(s).replace(/^the\s+/, "").replace(/\s+series$/, "").trim();

async function Lists() {
  const supabase = await createClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("titles")
      .select("id, title, series_number, series(name), credits(role, people(name)), copies(gone_at)")
      .order("title")
      .range(from, from + 999)
      .returns<Row[]>();
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const done = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("field_sources")
      .select("entity_id")
      .eq("entity_table", "titles")
      .eq("field", "series")
      .eq("source", "alexandra")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) done.add(r.entity_id);
    if ((data ?? []).length < 1000) break;
  }

  const owned = rows.filter((r) => r.copies.some((c) => !c.gone_at));
  const authorsOf = (r: Row) => r.credits.filter((c) => c.role === "author" && c.people).map((c) => c.people!.name);
  const seriesOf = new Map<string, Set<string>>();
  for (const r of owned) if (r.series) for (const a of authorsOf(r)) seriesOf.set(a, (seriesOf.get(a) ?? new Set()).add(r.series.name));

  const toBook = (r: Row, author: string): SeriesRowBook => {
    const options = [...(seriesOf.get(author) ?? [])].sort((a, b) => a.localeCompare(b));
    // "Married By Morning (Hathaways)" names its series; so may "Book 4".
    const paren = r.title.match(/\(([^()]+)\)\s*$/)?.[1] ?? null;
    const suggested = r.series?.name ?? options.find((o) => paren && seriesKey(paren).includes(seriesKey(o))) ?? null;
    const number = r.series_number ?? Number(r.title.match(/(?:book|#)\s*(\d+(?:\.\d+)?)/i)?.[1] ?? NaN);
    return {
      id: r.id,
      title: r.title,
      options,
      suggested,
      number: Number.isFinite(number) ? Number(number) : null,
      tidyTitle: paren ? r.title.replace(/\s*\([^()]+\)\s*$/, "").trim() : null,
    };
  };

  const missing = new Map<string, SeriesRowBook[]>();
  const unnumbered: SeriesRowBook[] = [];
  for (const r of owned) {
    if (done.has(r.id)) continue;
    const authors = authorsOf(r);
    if (r.series && r.series_number == null) unnumbered.push(toBook(r, authors[0] ?? ""));
    if (!r.series) {
      const author = authors.find((a) => seriesOf.has(a));
      if (author) missing.set(author, [...(missing.get(author) ?? []), toBook(r, author)]);
    }
  }
  const authors = [...missing.keys()].sort((a, b) => fold(a.split(" ").pop()!).localeCompare(fold(b.split(" ").pop()!)));
  const total = [...missing.values()].reduce((n, l) => n + l.length, 0);

  return (
    <>
      <h2 className="mt-8 font-serif text-xl font-semibold">Not in a series yet ({total})</h2>
      {authors.length === 0 && <p className="mt-2 text-sm text-muted">All checked.</p>}
      {authors.map((a) => (
        <section key={a} className="mt-5">
          <h3 className="text-sm font-medium">
            {a} <span className="text-muted">· series: {[...seriesOf.get(a)!].sort().join(", ")}</span>
          </h3>
          <ul className="mt-2 space-y-2">
            {missing.get(a)!.map((b) => (
              <li key={b.id}>
                <SeriesRow book={b} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2 className="mt-10 font-serif text-xl font-semibold">In a series, no number ({unnumbered.length})</h2>
      <p className="mt-1 text-sm text-muted">Novellas can use halves, like 2.5. Leave it empty if a book has no number.</p>
      <ul className="mt-3 space-y-2">
        {unnumbered.map((b) => (
          <li key={b.id}>
            <SeriesRow book={b} />
          </li>
        ))}
      </ul>
    </>
  );
}
