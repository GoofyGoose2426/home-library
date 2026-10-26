import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { LibraryView } from "@/components/library-view";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Home Library</h1>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/covers" className="rounded-full px-3 py-2 hover:bg-accent-soft">
            Check covers
          </Link>
          <form action={signOut}>
            <button type="submit" className="rounded-full px-3 py-2 text-muted hover:bg-accent-soft">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <Suspense fallback={<LibrarySkeleton />}>
        <Library />
      </Suspense>
    </main>
  );
}

async function Library() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  return <LibraryView books={books} />;
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
