import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { Lookup } from "@/app/lookup/lookup";
import { loadLibrary } from "@/lib/library";
import { sharedClient } from "@/lib/supabase/shared";
import { LinkOff, SharedFrame } from "../shared";

export default function SharedLookupPage({ params }: PageProps<"/s/[code]/lookup">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Suspense fallback={<p className="mt-6 text-muted">Opening the library…</p>}>
        <SharedLookup params={params} />
      </Suspense>
    </main>
  );
}

async function SharedLookup({ params }: Pick<PageProps<"/s/[code]/lookup">, "params">) {
  const { code } = await params;
  const supabase = await sharedClient(code);
  if (!supabase) return <LinkOff />;
  const books = await loadLibrary(supabase, { shared: true });
  return (
    <SharedFrame code={code}>
      <BackLink />
      <h1 className="mt-3 font-serif text-3xl font-semibold">Does Alexandra own it?</h1>
      <Lookup books={books} />
    </SharedFrame>
  );
}
