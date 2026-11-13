import { Suspense } from "react";
import Link from "next/link";
import { RateView } from "./rate-view";
import { loadLibrary } from "@/lib/library";
import { leftOutOfStats } from "@/lib/library-filters";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rate what you've read · Home Library" };

export default function RatePage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-6">
      <Link href="/stats" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Stats
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Rate what you&apos;ve read</h1>
      <p className="mt-2 text-muted">One book at a time. Tap the stars, then Next, or Skip any you&apos;d rather not rate now.</p>
      <Suspense fallback={<p className="mt-6 text-muted">Finding your books…</p>}>
        <Books />
      </Suspense>
    </main>
  );
}

// Books she's read with no stars yet (not reference or picture books).
async function Books() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  const toRate = books
    .filter((b) => b.readStatus === "read" && b.rating === null && !leftOutOfStats(b))
    .map((b) => ({
      id: b.id,
      title: b.title,
      authors: b.authors,
      series: b.series,
      seriesNumber: b.seriesNumber,
      coverUrl: b.coverUrl,
      coverConfirmed: b.coverConfirmed,
      formats: b.formats,
      addedAt: b.addedAt,
    }));
  return <RateView books={toRate} />;
}
