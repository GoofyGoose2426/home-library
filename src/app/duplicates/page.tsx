import { Suspense } from "react";
import Link from "next/link";
import { copyList } from "@/lib/copy-labels";
import { fold } from "@/lib/library-filters";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";
import { DuplicateGroup } from "./duplicate-group";

export const metadata = { title: "Possible duplicates · Home Library" };

export default function DuplicatesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Possible duplicates</h1>
      <p className="mt-2 text-muted">
        Entries with the same title and author, usually the same book imported once from your shelf and once from an
        app. Tap <strong className="font-medium text-foreground">Keep this one</strong> on the entry whose details you
        want; the others&apos; copies, genres and ratings move into it.
      </p>
      <Suspense fallback={<p className="mt-6 text-muted">Looking for duplicates…</p>}>
        <Groups />
      </Suspense>
    </main>
  );
}

// The whole title, subtitle included, ignoring case, accents, punctuation and
// bracketed notes: "Love In The Afternoon (Hathaways)" = "Love in the Afternoon".
const titleKey = (s: string) =>
  fold(s)
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");

const surname = (name: string) => fold(name).replace(/\(.*?\)/g, "").trim().split(/\s+/).pop() ?? "";

async function Groups() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  // Same title (and volume), and a shared author surname.
  const byKey = new Map<string, typeof books>();
  for (const b of books) {
    const key = titleKey(b.title);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), b]);
  }
  const groups = [...byKey.values()]
    .filter((g) => g.length > 1)
    .map((g) => g.filter((b) => g.some((o) => o !== b && (!b.authors.length || !o.authors.length || b.authors.some((a) => o.authors.map(surname).includes(surname(a)))))))
    .filter((g) => g.length > 1);

  if (!groups.length) {
    return <p className="mt-8 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-muted">No duplicates found.</p>;
  }
  return (
    <>
      <p className="mt-6 text-sm text-muted">
        {groups.length} {groups.length === 1 ? "group" : "groups"} to check. Not the same book (say, two editions you
        want kept apart)? Just leave it.
      </p>
      <ul className="mt-3 space-y-4">
        {groups.map((g) => (
          <li key={g.map((b) => b.id).join()}>
            <DuplicateGroup
              books={g.map((b) => ({
                id: b.id,
                title: b.title,
                authors: b.authors.join(", "),
                copies: copyList(b),
                series: b.series ? `${b.series}${b.seriesNumber != null ? ` #${Number(b.seriesNumber)}` : ""}` : null,
                readStatus: b.readStatus,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
