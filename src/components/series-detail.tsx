import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { StatusTags } from "@/components/library-chrome";
import { AddToSeries, SeriesSettings, VolumeEdit } from "@/components/series-editor";
import { copyList } from "@/lib/copy-labels";
import type { SeriesCandidate, SeriesPage } from "@/lib/series";

// One series: its volumes in order. Alexandra can add books, change numbers,
// rename or delete it; the view-only link (readOnly) only reads.
export function SeriesDetail({
  series,
  candidates = [],
  readOnly = false,
  base = "",
}: {
  series: SeriesPage;
  candidates?: SeriesCandidate[];
  readOnly?: boolean;
  base?: string;
}) {
  const owned = series.volumes.filter((v) => v.owned);
  const read = owned.filter((v) => v.readStatus === "read").length;
  const authors = [...new Set(series.volumes.flatMap((v) => v.authors))];
  const numbers = series.volumes.flatMap((v) => (v.number == null ? [] : [v.number]));
  const nextNumber = numbers.length ? Math.floor(Math.max(...numbers)) + 1 : 1;

  return (
    <>
      <h1 className="mt-3 font-serif text-3xl font-semibold">{series.name}</h1>
      <p className="mt-1 text-muted">
        {authors.length > 0 && <>{authors.slice(0, 3).join(", ")} · </>}
        {owned.length} {owned.length === 1 ? "book" : "books"}
        {owned.length > 0 && <> · {read} read</>}
      </p>
      {!readOnly && <SeriesSettings id={series.id} name={series.name} count={series.volumes.length} />}

      {series.volumes.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          No books in this series yet.{!readOnly && " Add the first one below."}
        </p>
      ) : (
        <ol className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
          {series.volumes.map((v) => (
            <li key={v.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-9 shrink-0 text-right text-sm font-medium text-muted">
                {v.number == null ? "–" : `#${v.number}`}
              </span>
              <Link href={`${base}/books/${v.id}`} className="w-10 shrink-0">
                <BookCover title={v.title} authors={v.authors} url={v.coverUrl} unconfirmed={!v.coverConfirmed} className="w-10" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`${base}/books/${v.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                  {v.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {v.owned ? copyList(v) : "On the Gone list"}
                </p>
                <div className="mt-1">
                  <StatusTags book={{ readStatus: v.readStatus, onLoanTo: [] }} showLoan={false} />
                </div>
              </div>
              {!readOnly && <VolumeEdit titleId={v.id} series={series.name} number={v.number} />}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && (
        <AddToSeries
          series={series.name}
          inSeries={series.volumes.map((v) => v.id)}
          authors={authors}
          candidates={candidates}
          nextNumber={nextNumber}
        />
      )}

      <p className="mt-6 text-sm">
        <Link
          href={`${base || "/"}?series=${encodeURIComponent(series.name)}&sort=series`}
          className="text-accent underline-offset-4 hover:underline"
        >
          Show these in the library
        </Link>
      </p>
    </>
  );
}
