import { Suspense } from "react";
import Link from "next/link";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";
import { FormatReview, type PrintCopy } from "./format-review";

export const metadata = { title: "Print formats · Home Library" };

export default function FormatsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Print formats</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every print copy, grouped by type. Scan each group for one that&apos;s in the wrong place and change it; it moves
        to the right group straight away.
      </p>
      <Suspense fallback={<p className="mt-6 text-muted">Gathering your print copies…</p>}>
        <Copies />
      </Suspense>
    </main>
  );
}

async function Copies() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  const copies: PrintCopy[] = books.flatMap((b) =>
    b.copies
      .filter((c) => c.source === "shelf")
      .map((c) => ({ id: c.id, format: c.format as PrintCopy["format"], titleId: b.id, title: b.title, authors: b.authors, coverUrl: b.coverUrl })),
  );
  return <FormatReview copies={copies} />;
}
