"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { fillBookDetails, type FillResult } from "./actions";

const BATCH = 4;
const SOURCE: Record<string, string> = { openlibrary: "Open Library", googlebooks: "Google Books", both: "Open Library + Google Books" };

export function FillRunner({ unchecked, checked, google }: { unchecked: string[]; checked: string[]; google: boolean }) {
  const [again, setAgain] = useState(false);
  const queue = again ? [...unchecked, ...checked] : unchecked;
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<FillResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const stop = useRef(false);
  const position = useRef(0);

  async function run() {
    setMessage(null);
    setRunning(true);
    stop.current = false;
    while (!stop.current && position.current < queue.length) {
      const batch = queue.slice(position.current, position.current + BATCH);
      const r = await fillBookDetails(batch).catch(() => ({ ok: false as const, error: "Lost the connection. Tap Start to carry on." }));
      if (!r.ok) {
        setMessage(r.error);
        break;
      }
      position.current += batch.length;
      setDone(position.current);
      setResults((prev) => [...r.results, ...prev].slice(0, 400));
    }
    setRunning(false);
    if (position.current >= queue.length) setMessage("All done. Open any book to see what was filled in.");
  }

  const matched = results.filter((r) => r.source);
  const filledSomething = results.filter((r) => r.filled.length);
  const pct = queue.length ? Math.round((done / queue.length) * 100) : 100;

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-3xl border border-border bg-surface p-4">
        <p className="text-sm">
          <strong>{unchecked.length.toLocaleString()}</strong> {unchecked.length === 1 ? "book" : "books"} not checked yet ·{" "}
          {checked.length.toLocaleString()} checked before
        </p>
        <p className="mt-1 text-xs text-muted">
          Google Books is {google ? "on" : "off (Open Library only). Add the free key to turn it on"}. It takes about 2
          seconds a book, so the whole library takes 30–40 minutes. Keep this page open; you can pause and carry on
          later, even on another day.
        </p>
        {checked.length > 0 && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={again}
              disabled={running || done > 0}
              onChange={(e) => setAgain(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            Also check the {checked.length.toLocaleString()} {checked.length === 1 ? "book" : "books"} checked before
          </label>
        )}

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          {done.toLocaleString()} of {queue.length.toLocaleString()} checked
          {results.length > 0 && ` · ${matched.length} found · ${filledSomething.length} got new details`}
        </p>

        <div className="mt-4 flex gap-2">
          {running ? (
            <button type="button" onClick={() => (stop.current = true)} className="min-h-11 rounded-full border border-border px-5 text-sm">
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={run}
              disabled={done >= queue.length}
              className="min-h-11 rounded-full bg-accent px-6 text-sm font-medium text-on-accent disabled:opacity-50"
            >
              {done > 0 ? "Carry on" : "Start"}
            </button>
          )}
        </div>
        {message && (
          <p role="status" className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm">
            {message}
          </p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
          {results.map((r) => (
            <li key={r.id} className="px-4 py-2.5">
              <Link href={`/books/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                {r.title}
              </Link>
              <span className="block text-xs text-muted">
                {r.source
                  ? r.filled.length
                    ? `${SOURCE[r.source]}: ${r.filled.join(", ")}`
                    : `${SOURCE[r.source]}: nothing new`
                  : "No sure match. Skipped"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
