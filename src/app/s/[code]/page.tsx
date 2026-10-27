import { Suspense } from "react";
import { LibraryView } from "@/components/library-view";
import { loadLibrary } from "@/lib/library";
import { sharedClient } from "@/lib/supabase/shared";
import { LinkOff, SharedFrame, SharedHeader } from "./shared";

export default function SharedLibraryPage({ params }: PageProps<"/s/[code]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
      <Suspense fallback={<p className="mt-8 text-muted">Opening the library…</p>}>
        <SharedLibrary params={params} />
      </Suspense>
      <footer className="mt-12 border-t border-border pt-4 text-xs text-muted">View only. Shared by Alexandra.</footer>
    </main>
  );
}

async function SharedLibrary({ params }: Pick<PageProps<"/s/[code]">, "params">) {
  const { code } = await params;
  const supabase = await sharedClient(code);
  if (!supabase) return <LinkOff />;
  const books = await loadLibrary(supabase, { shared: true });
  return (
    <SharedFrame code={code}>
      <SharedHeader code={code} />
      <LibraryView books={books} />
    </SharedFrame>
  );
}
