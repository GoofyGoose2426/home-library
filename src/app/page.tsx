import { Suspense } from "react";
import { LibraryView } from "@/components/library-view";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    // The menus live in LibraryView (pinned on a phone, down the side on a
    // wide screen), so the page itself is just the library.
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 lg:pb-10">
      <Suspense fallback={<LibrarySkeleton />}>
        <Library />
      </Suspense>
    </main>
  );
}

async function Library() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  return <LibraryView books={books} owner />;
}

function LibrarySkeleton() {
  return (
    <ul className="mt-16 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7" aria-label="Loading your library">
      {Array.from({ length: 12 }, (_, i) => (
        <li key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-accent-soft" />
      ))}
    </ul>
  );
}
