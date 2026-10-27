import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FillRunner } from "./fill-runner";

export const metadata = { title: "Fill in details · Home Library" };

export default function FillPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Fill in details</h1>
      <p className="mt-2 text-muted">
        Looks up each book on Open Library{process.env.GOOGLE_BOOKS_API_KEY ? " and Google Books" : ""} by title and
        author, and fills in the description, first published year, typical length, a word estimate, and series where
        a book has none. Copies with an ISBN also get their publisher and page count.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Only empty fields are filled. Anything you set or cleared is never touched.</li>
        <li>Everything arrives <strong className="font-medium text-foreground">unconfirmed</strong>, with its source on the book page.</li>
        <li>A book is skipped unless both the title and an author match, so nothing is guessed.</li>
      </ul>
      <Suspense fallback={<p className="mt-6 text-muted">Counting your books…</p>}>
        <Pending />
      </Suspense>
    </main>
  );
}

async function Pending() {
  const supabase = await createClient();
  const rows: { id: string; title: string; details_checked_at: string | null; description: string | null; copies: { gone_at: string | null }[] }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("titles")
      .select("id, title, details_checked_at, description, copies(gone_at)")
      .order("title")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const owned = rows.filter((r) => r.copies.some((c) => !c.gone_at));
  return (
    <FillRunner
      unchecked={owned.filter((r) => !r.details_checked_at).map((r) => r.id)}
      checked={owned.filter((r) => r.details_checked_at).map((r) => r.id)}
      missingDescription={owned.filter((r) => r.details_checked_at && !r.description).map((r) => r.id)}
      google={!!process.env.GOOGLE_BOOKS_API_KEY}
    />
  );
}
