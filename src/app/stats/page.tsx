import { Suspense } from "react";
import Link from "next/link";
import { StatsView } from "@/components/stats-view";
import { loadLibrary } from "@/lib/library";
import { leftOutOfStats } from "@/lib/library-filters";
import { loadPinned } from "@/lib/reports";
import { statBooks } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Stats · Home Library" };

export default function StatsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Stats</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Counting your books…</p>}>
        <Stats />
      </Suspense>
    </main>
  );
}

async function Stats() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  return <StatsView data={statBooks(books)} leftOut={books.filter(leftOutOfStats).length} pinned={await loadPinned(supabase, books)} />;
}
