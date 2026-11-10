import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { SeriesDetail } from "@/components/series-detail";
import { loadSeries } from "@/lib/series";
import { sharedClient } from "@/lib/supabase/shared";
import { LinkOff, SharedFrame } from "../../shared";

export default function SharedSeriesPage({ params }: PageProps<"/s/[code]/series/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Suspense fallback={<p className="mt-8 text-muted">Opening the series…</p>}>
        <SharedSeries params={params} />
      </Suspense>
    </main>
  );
}

async function SharedSeries({ params }: Pick<PageProps<"/s/[code]/series/[id]">, "params">) {
  const { code, id } = await params;
  const supabase = await sharedClient(code);
  if (!supabase) return <LinkOff />;
  const series = await loadSeries(supabase, id, { shared: true });
  if (!series) notFound();
  return (
    <SharedFrame code={code}>
      <BackLink />
      <SeriesDetail series={series} readOnly base={`/s/${code}`} />
    </SharedFrame>
  );
}
