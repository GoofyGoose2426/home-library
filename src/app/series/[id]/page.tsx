import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeriesDetail } from "@/components/series-detail";
import { loadSeries, loadSeriesCandidates } from "@/lib/series";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Series · Home Library" };

export default function SeriesPage({ params }: PageProps<"/series/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <p className="flex gap-4 text-sm">
        <Link href="/" className="text-accent underline-offset-4 hover:underline">
          ← Library
        </Link>
        <Link href="/series" className="text-accent underline-offset-4 hover:underline">
          All series
        </Link>
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Opening the series…</p>}>
        <SeriesData params={params} />
      </Suspense>
    </main>
  );
}

async function SeriesData({ params }: Pick<PageProps<"/series/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const [series, candidates] = await Promise.all([loadSeries(supabase, id), loadSeriesCandidates(supabase)]);
  if (!series) notFound();
  return <SeriesDetail series={series} candidates={candidates} />;
}
