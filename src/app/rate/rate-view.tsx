"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { setReview } from "@/app/edit-actions";
import { BookCover } from "@/components/book-cover";
import { StarPicker } from "@/components/quick-edit";
import { authorSortKey, alphaCompare } from "@/lib/library-filters";
import type { CopyFormat } from "@/lib/library";

// Rate what you've read: one book at a time, stars only. A pick saves at
// once; Next moves on. Skipped books are remembered on this device, and
// rated books leave the list for good, so she can stop and come back.

export type RateBook = {
  id: string;
  title: string;
  authors: string[];
  series: string | null;
  seriesNumber: number | null;
  coverUrl: string | null;
  coverConfirmed: boolean;
  formats: CopyFormat[];
  addedAt: string;
};

type Order = "author" | "added" | "random";
const ORDERS: [Order, string][] = [
  ["author", "By author"],
  ["added", "Recently added"],
  ["random", "Random"],
];

const FORMAT: Record<CopyFormat, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market",
  print_unknown: "Print",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

// Browser storage is a convenience only; the page works without it.
function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// A steady shuffle: the same seed gives the same order, so Random doesn't
// jump around between visits.
function shuffled<T extends { id: string }>(list: T[], seed: number) {
  const rank = (id: string) => {
    let h = seed;
    for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0;
    return h;
  };
  return [...list].sort((a, b) => rank(a.id) - rank(b.id));
}

export function RateView({ books }: { books: RateBook[] }) {
  const [order, setOrder] = useState<Order>("author");
  const [seed, setSeed] = useState(1);
  const [skipped, setSkipped] = useState<string[]>([]);
  // Rated (or moved past) in this visit, in order, for Back.
  const [done, setDone] = useState<string[]>([]);
  const [history, setHistory] = useState<{ id: string; was: "done" | "skipped" }[]>([]);
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Read once after the page loads (the server has no browser storage).
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrder(load<Order>("rate.order", "author"));
    setSkipped(load<string[]>("rate.skipped", []));
    const s = load<number>("rate.seed", 0) || Math.floor(Math.random() * 1e9);
    setSeed(s);
    save("rate.seed", s);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const sorted = useMemo(() => {
    if (order === "random") return shuffled(books, seed);
    if (order === "added") return [...books].sort((a, b) => b.addedAt.localeCompare(a.addedAt) || alphaCompare(a.title, b.title));
    return [...books].sort(
      (a, b) =>
        authorSortKey(a.authors[0]).localeCompare(authorSortKey(b.authors[0])) ||
        (a.series ?? "").localeCompare(b.series ?? "") ||
        (a.seriesNumber ?? 999) - (b.seriesNumber ?? 999) ||
        alphaCompare(a.title, b.title),
    );
  }, [books, order, seed]);

  const queue = sorted.filter((b) => !skipped.includes(b.id) && !done.includes(b.id));
  const book = queue[0];
  const ratedNow = Object.values(ratings).filter((v) => v != null).length;
  const rating = book ? (ratings[book.id] ?? null) : null;

  function pick(v: number | null) {
    if (!book) return;
    const id = book.id;
    const before = ratings[id] ?? null;
    setRatings((r) => ({ ...r, [id]: v }));
    setMessage(null);
    start(async () => {
      try {
        await setReview(id, { rating: v });
      } catch (e) {
        setRatings((r) => ({ ...r, [id]: before }));
        setMessage(e instanceof Error ? e.message : "Couldn't save that.");
      }
    });
  }

  function next() {
    if (!book) return;
    setDone((d) => [...d, book.id]);
    setHistory((h) => [...h, { id: book.id, was: "done" }]);
  }

  function skip() {
    if (!book) return;
    const list = [...skipped, book.id];
    setSkipped(list);
    save("rate.skipped", list);
    setHistory((h) => [...h, { id: book.id, was: "skipped" }]);
  }

  function back() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    if (last.was === "done") setDone((d) => d.filter((x) => x !== last.id));
    else {
      const list = skipped.filter((x) => x !== last.id);
      setSkipped(list);
      save("rate.skipped", list);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Order">
        {ORDERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={order === k}
            onClick={() => {
              setOrder(k);
              save("rate.order", k);
            }}
            className={`min-h-9 rounded-full border px-3 text-sm ${order === k ? "border-accent bg-accent text-on-accent" : "border-border bg-background"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">
        {ratedNow > 0 && <>{ratedNow.toLocaleString()} rated this visit · </>}
        {queue.length.toLocaleString()} still to rate
        {skipped.length > 0 && (
          <>
            {" "}
            · {skipped.length.toLocaleString()} skipped{" "}
            <button
              type="button"
              onClick={() => {
                setSkipped([]);
                save("rate.skipped", []);
                setHistory((h) => h.filter((x) => x.was !== "skipped"));
              }}
              className="text-accent underline-offset-4 hover:underline"
            >
              Show them again
            </button>
          </>
        )}
      </p>

      {book ? (
        <article className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
          <div className="flex gap-4">
            <BookCover title={book.title} authors={book.authors} url={book.coverUrl} unconfirmed={!book.coverConfirmed} className="w-24 shrink-0 sm:w-28" />
            <div className="min-w-0">
              <h2 className="font-serif text-xl font-semibold leading-snug">{book.title}</h2>
              {book.authors.length > 0 && <p className="text-sm">{book.authors.join(", ")}</p>}
              {book.series && (
                <p className="mt-1 text-xs text-muted">
                  {book.series}
                  {book.seriesNumber != null && ` #${book.seriesNumber}`}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">{book.formats.map((f) => FORMAT[f]).join(" · ")}</p>
              <Link href={`/books/${book.id}#review`} className="mt-2 inline-block text-xs text-accent underline-offset-4 hover:underline">
                Write a full review →
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <StarPicker key={book.id} value={rating} onChange={pick} />
          </div>
          {message && (
            <p role="alert" className="mt-2 text-xs text-accent">
              {message}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={next}
              disabled={rating == null || busy}
              className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
            >
              {busy ? "Saving…" : "Next →"}
            </button>
            <button type="button" onClick={skip} disabled={busy} className="min-h-11 rounded-full border border-border px-4 text-sm">
              Skip
            </button>
            {history.length > 0 && (
              <button type="button" onClick={back} disabled={busy} className="min-h-11 px-2 text-sm text-muted underline-offset-4 hover:underline">
                Back
              </button>
            )}
          </div>
        </article>
      ) : (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <p className="font-serif text-xl font-semibold">{books.length ? "All caught up" : "Every book you've read has stars"}</p>
          <p className="mt-2 text-muted">
            {skipped.length ? `You skipped ${skipped.length.toLocaleString()}. Show them again any time above.` : "Nicely done."}
          </p>
          {history.length > 0 && (
            <button type="button" onClick={back} className="mt-3 text-sm text-accent underline-offset-4 hover:underline">
              Back to the last one
            </button>
          )}
        </div>
      )}
    </div>
  );
}
