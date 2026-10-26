import { Suspense } from "react";
import Link from "next/link";
import { namesOf } from "@/lib/book";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";
import { AddBook } from "./add-book";

export const metadata = { title: "Add a book · Home Library" };

export default function AddPage({ searchParams }: PageProps<"/add">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <Suspense fallback={<p className="mt-6 text-muted">Opening…</p>}>
        <AddData searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AddData({ searchParams }: Pick<PageProps<"/add">, "searchParams">) {
  const { to } = await searchParams;
  const supabase = await createClient();
  const [books, seriesNames, peopleNames] = await Promise.all([
    loadLibrary(supabase, { includeGone: true }),
    namesOf(supabase, "series"),
    namesOf(supabase, "people"),
  ]);
  const target = typeof to === "string" ? books.find((b) => b.id === to) : undefined;
  // Books whose copies are all on the Gone list come along so a re-bought
  // book is recognised; their copy list is empty.
  return (
    <AddBook
      library={books.map((b) => ({ id: b.id, title: b.title, authors: b.authors, copies: b.copies, series: b.series, seriesNumber: b.seriesNumber }))}
      copyOf={target ? { id: target.id, title: target.title, authors: target.authors, copies: target.copies } : null}
      seriesNames={seriesNames}
      peopleNames={peopleNames}
    />
  );
}
