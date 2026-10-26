import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IMPORT_BATCH, planByKey, reviewItems } from "@/lib/import/data";
import type { DecidedValue } from "@/lib/import/decisions";
import { ReviewList, type ReviewRow } from "./review-list";

export const metadata = { title: "Check your import · Home Library" };

// Saving ~1,100 books takes a little while.
export const maxDuration = 300;

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-40 pt-8">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Check your import</h1>
      <p className="mt-2 text-muted">
        I read your shelf photos and app screenshots. These are the things I wasn&apos;t sure about.
        Your choices save as you go, and nothing goes into your library until you tap{" "}
        <strong>Save my library</strong>.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading your list…</p>}>
        <ReviewData />
      </Suspense>
    </main>
  );
}

async function ReviewData() {
  const supabase = await createClient();

  // Put the review items in the database once. Re-running keeps decisions.
  const { error: seedError } = await supabase.from("import_items").upsert(
    reviewItems.map((r) => ({
      batch: IMPORT_BATCH,
      kind: r.kind,
      item_key: r.item_key,
      note: r.note,
      raw: { ...r.raw, title_key: r.title_key },
      suggested: r.suggested,
    })),
    { onConflict: "owner_id,batch,item_key", ignoreDuplicates: true },
  );
  if (seedError) throw new Error(seedError.message);

  const [{ data: items, error }, { data: saved }] = await Promise.all([
    supabase
      .from("import_items")
      .select("item_key, kind, note, raw, decision, decided_value")
      .eq("batch", IMPORT_BATCH),
    supabase.from("import_batches").select("summary").eq("batch", IMPORT_BATCH).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);

  const order = new Map(reviewItems.map((r, i) => [r.item_key, i]));
  const rows: ReviewRow[] = (items ?? [])
    .sort((a, b) => (order.get(a.item_key) ?? 0) - (order.get(b.item_key) ?? 0))
    .map((item) => {
      const title = planByKey.get(item.raw.title_key as string);
      return {
        key: item.item_key,
        kind: item.kind,
        note: item.note,
        title: title?.title ?? String(item.raw.title ?? item.raw.reading ?? ""),
        authors: title?.authors ?? [],
        where: null,
        decision: item.decision,
        value: item.decided_value as DecidedValue | null,
      };
    });

  return <ReviewList rows={rows} savedSummary={saved?.summary ?? null} />;
}
