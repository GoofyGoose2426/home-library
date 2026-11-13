import { Suspense } from "react";
import { StatsView } from "@/components/stats-view";
import { loadLibrary } from "@/lib/library";
import { leftOutOfStats } from "@/lib/library-filters";
import { loadPinned } from "@/lib/reports";
import { statBooks } from "@/lib/stats";
import { sharedClient } from "@/lib/supabase/shared";
import { LinkOff, SharedFrame, SharedHeader } from "../shared";

export const metadata = { title: "Stats · Alexandra's library" };

export default function SharedStatsPage({ params }: PageProps<"/s/[code]/stats">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
      <Suspense fallback={<p className="mt-8 text-muted">Counting the books…</p>}>
        <SharedStats params={params} />
      </Suspense>
      <footer className="mt-12 border-t border-border pt-4 text-xs text-muted">View only. Shared by Alexandra.</footer>
    </main>
  );
}

async function SharedStats({ params }: Pick<PageProps<"/s/[code]/stats">, "params">) {
  const { code } = await params;
  const supabase = await sharedClient(code);
  if (!supabase) return <LinkOff />;
  const books = await loadLibrary(supabase, { shared: true });
  return (
    <SharedFrame code={code}>
      <SharedHeader code={code} />
      <StatsView data={statBooks(books)} leftOut={books.filter(leftOutOfStats).length} pinned={await loadPinned(supabase, books)} />
    </SharedFrame>
  );
}
