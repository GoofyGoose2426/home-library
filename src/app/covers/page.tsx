import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CoverCheck, type CoverRow } from "./cover-check";

export const metadata = { title: "Check covers · Home Library" };

export default function CoversPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Check covers</h1>
      <p className="mt-2 max-w-2xl text-muted">
        These are best guesses from Open Library, matched by title and author, so some will be a
        different edition or the wrong book. Tap a cover that&apos;s wrong to remove it; the book
        keeps its colour card until you add the right one.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading covers…</p>}>
        <Covers />
      </Suspense>
    </main>
  );
}

async function Covers() {
  const supabase = await createClient();
  const rows: CoverRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("titles")
      .select("id, title, credits(role, position, people(name)), copies(cover_url, cover_confirmed)")
      .order("title")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const t of data ?? []) {
      const cover = t.copies.find((c) => c.cover_url);
      rows.push({
        id: t.id,
        title: t.title,
        authors: t.credits
          .filter((c) => c.role === "author")
          .sort((a, b) => a.position - b.position)
          .flatMap((c) => (c.people ? [(c.people as unknown as { name: string }).name] : [])),
        url: cover?.cover_url ?? null,
        confirmed: cover?.cover_confirmed ?? false,
      });
    }
    if ((data ?? []).length < 1000) break;
  }
  return <CoverCheck rows={rows} />;
}
