"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { useViewMode } from "@/components/view-mode";
import { copyList } from "@/lib/copy-labels";
import type { LibraryBook } from "@/lib/library";
import {
  PRINT_NAME,
  findBooks,
  findSeries,
  formatSummary,
  ranges,
  seriesStatus,
  type SeriesStatus,
} from "@/lib/lookup";

// Viewers of the shared link read "Alexandra owns it", not "You own it".
function useWords() {
  const { readOnly } = useViewMode();
  return readOnly
    ? { own: "Alexandra owns", library: "Alexandra's library", have: "she has", missing: "she's missing", ownLower: "Alexandra owns", shelf: "her shelf" }
    : { own: "You own", library: "your library", have: "you have", missing: "you're missing", ownLower: "you own", shelf: "your shelf" };
}

export function Lookup({ books }: { books: LibraryBook[] }) {
  const w = useWords();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);

  const matches = useMemo(() => findBooks(books, q), [books, q]);
  const seriesNamed = useMemo(() => findSeries(books, q), [books, q]);
  const series = useMemo(() => {
    const names = [
      ...seriesNamed,
      ...matches.slice(0, 5).flatMap((m) => (m.book.series ? [m.book.series] : [])),
    ];
    return [...new Set(names)].slice(0, 3).map((n) => seriesStatus(books, n));
  }, [books, matches, seriesNamed]);

  const typed = q.trim().length >= 2;
  const exact = matches.filter((m) => m.score >= 60);
  const verdict = !typed
    ? null
    : exact.length
      ? "own"
      : seriesNamed.length
        ? "series"
        : matches.length
          ? "maybe"
          : "none";
  const seriesCards = series
    .filter((s) => s.volumes.length + s.unnumbered.length > 0)
    .map((s) => <SeriesCard key={s.name} status={s} />);

  return (
    <div className="mt-4">
      <label className="block">
        <span className="sr-only">Title, author or series</span>
        <input
          type="search"
          autoFocus
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, author or series"
          className="w-full rounded-3xl border-2 border-border bg-surface px-5 py-4 text-xl outline-none focus:border-accent"
        />
      </label>

      {!typed && (
        <p className="mt-4 text-muted">
          Type a few letters of a title, author or series. You&apos;ll see straight away whether it&apos;s in {w.library},
          in which formats, and which volumes of the series {w.missing}.
        </p>
      )}

      {verdict === "own" && (
        <Verdict tone="own" title={`✓ ${w.own} it`}>
          {exact.length === 1 ? "1 book matches." : `${exact.length} books match.`}
        </Verdict>
      )}
      {verdict === "series" && (
        <Verdict tone="own" title={`✓ ${w.own} books in this series`}>
          See which volumes {w.have} and which {w.missing} below.
        </Verdict>
      )}
      {verdict === "series" && seriesCards}
      {verdict === "maybe" && (
        <Verdict tone="maybe" title="Not by that title">
          No title matches exactly, but these books share an author or series.
        </Verdict>
      )}
      {verdict === "none" && (
        <Verdict tone="none" title={`✗ Not in ${w.library}`}>
          Nothing {w.ownLower} matches &ldquo;{q.trim()}&rdquo;.
        </Verdict>
      )}

      {matches.length > 0 && (
        <ul className="mt-4 space-y-3">
          {matches.map(({ book }) => (
            <li key={book.id}>
              <BookResult book={book} />
            </li>
          ))}
        </ul>
      )}

      {typed && verdict !== "series" && seriesCards}
    </div>
  );
}

function Verdict({ tone, title, children }: { tone: "own" | "maybe" | "none"; title: string; children: React.ReactNode }) {
  const style =
    tone === "own"
      ? "bg-accent text-on-accent"
      : tone === "none"
        ? "border-2 border-border bg-surface"
        : "bg-accent-soft";
  return (
    <div role="status" className={`mt-5 rounded-3xl px-5 py-4 ${style}`}>
      <p className="font-serif text-2xl font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-90">{children}</p>
    </div>
  );
}

function BookResult({ book }: { book: LibraryBook }) {
  const { base } = useViewMode();
  const { digitalOnly } = formatSummary(book);
  return (
    <Link href={`${base}/books/${book.id}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-accent-soft">
      <BookCover title={book.title} authors={[]} url={book.coverUrl} className="w-14 shrink-0 !rounded-lg !p-1 [&_p]:hidden" />
      <div className="min-w-0">
        <p className="font-medium leading-snug">{book.title}</p>
        <p className="text-sm text-muted">
          {book.authors.join(", ")}
          {book.series && ` · ${book.series}${book.seriesNumber != null ? ` #${Number(book.seriesNumber)}` : ""}`}
        </p>
        <p className="mt-1 text-sm">{copyList(book)}</p>
        <p className="text-xs text-muted">
          {book.readStatus === "read" ? "✓ Read" : book.readStatus === "partly_read" ? "Partly read" : "Unread"}
          {book.onLoanTo.length > 0 && ` · On loan to ${book.onLoanTo.join(", ")}`}
        </p>
        {digitalOnly && (
          <p className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium">
            No print copy yet
          </p>
        )}
      </div>
    </Link>
  );
}

function SeriesCard({ status: s }: { status: SeriesStatus }) {
  const { base } = useViewMode();
  const w = useWords();
  const owned = s.volumes.filter((v) => v.book).length + s.unnumbered.length;
  return (
    <section className="mt-6 rounded-3xl border border-border bg-surface p-4">
      <h2 className="font-serif text-xl font-semibold">{s.name}</h2>
      <p className="mt-1 text-sm">
        {w.own} <strong>{owned}</strong> {owned === 1 ? "book" : "books"} in this series
        {s.missing.length > 0 ? (
          <>
            . <strong>Missing {ranges(s.missing)}</strong>
          </>
        ) : s.volumes.length > 0 ? (
          `, #1–#${s.volumes.length} with no gaps`
        ) : (
          ""
        )}
        .
      </p>
      {s.matchFormat && (
        <p className="mt-1 text-sm">
          To match {w.shelf}, buy <strong>{PRINT_NAME[s.matchFormat]}</strong>.
          {s.mismatched.length > 0 && ` (${ranges(s.mismatched)} ${s.mismatched.length === 1 ? "is a" : "are"} different print type.)`}
        </p>
      )}
      {s.noPrint.length > 0 && <p className="mt-1 text-sm text-muted">No print copy yet: {ranges(s.noPrint)}.</p>}

      {s.volumes.length > 0 && (
        <ol className="mt-3 divide-y divide-border rounded-2xl border border-border">
          {s.volumes.map((v) => (
            <li key={v.number} className="flex items-baseline gap-3 px-3 py-2 text-sm">
              <span className="w-9 shrink-0 text-muted">#{v.number}</span>
              {v.book ? (
                <>
                  <Link href={`${base}/books/${v.book.id}`} className="min-w-0 flex-1 underline-offset-4 hover:underline">
                    {v.book.title}
                  </Link>
                  <span
                    className={`shrink-0 text-xs ${
                      s.mismatched.includes(v.number) || !v.printFormat ? "font-medium text-accent" : "text-muted"
                    }`}
                  >
                    {v.printFormat ? PRINT_NAME[v.printFormat] : "no print"}
                  </span>
                </>
              ) : (
                <span className="flex-1 font-medium text-accent">Missing</span>
              )}
            </li>
          ))}
        </ol>
      )}
      {s.unnumbered.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Also in this series (prequels, novellas or unnumbered):{" "}
          {s.unnumbered
            .map((b) => (b.seriesNumber != null ? `${b.title} (#${Number(b.seriesNumber)})` : b.title))
            .join(", ")}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Gaps are counted up to the highest number {w.ownLower}. Later volumes show once series details are filled in
        (Phase 2).
      </p>
    </section>
  );
}
