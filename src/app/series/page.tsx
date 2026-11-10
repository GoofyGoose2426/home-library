import { Suspense } from "react";
import Link from "next/link";
import { NewSeries, SeriesFilter } from "@/components/series-editor";
import { loadSeriesList } from "@/lib/series";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Series · Home Library" };

export default function SeriesListPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Series</h1>
      <p className="mt-2 text-muted">
        Tap a series to see its books in order, add books to it, or change their numbers.
      </p>
      <NewSeries />
      <Suspense fallback={<p className="mt-6 text-muted">Opening your series…</p>}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const supabase = await createClient();
  const series = await loadSeriesList(supabase);
  return <SeriesFilter series={series} />;
}
