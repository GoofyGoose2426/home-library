"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createSeries, deleteSeries, renameSeries, setSeries } from "@/app/edit-actions";
import { fold } from "@/lib/library-filters";
import type { SeriesCandidate } from "@/lib/series";

// The editing parts of the series pages. Every change goes through setSeries,
// which marks the series as Alexandra's, so no later fill-in changes it.

const input = "block w-full rounded-lg border border-border bg-background px-2 py-2 text-base text-foreground";
const primary = "min-h-10 shrink-0 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40";
const quiet = "min-h-9 shrink-0 rounded-full border border-border px-3 text-sm";

// "Nancy Drew #2: The Hidden Staircase" and "Book 2" name their number.
function numberIn(title: string) {
  const m = title.match(/(?:#|\bbook\s*|\bvol(?:ume)?\.?\s*)(\d+(?:\.\d+)?)/i);
  return m ? m[1] : "";
}

function parseNumber(text: string): number | null | undefined {
  if (text.trim() === "") return null;
  const n = Number(text.trim());
  return Number.isFinite(n) && n >= 0 && n < 10000 ? n : undefined;
}

function Alert({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="mt-2 text-xs text-accent">
      {message}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------
// The series list: start a new series.

export function NewSeries() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const r = await createSeries(name);
      if (!r.ok) return setMessage(r.error);
      setName("");
      router.push(`/series/${r.id}`);
    });
  }

  return (
    <form onSubmit={add} className="mt-5 rounded-2xl border border-border bg-surface p-3">
      <label className="text-sm font-medium" htmlFor="new-series">
        Add a series
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="new-series"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Series name, like Nancy Drew Mystery Stories"
          className={input}
        />
        <button type="submit" disabled={!name.trim() || busy} className={primary}>
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      <Alert message={message} />
    </form>
  );
}

export function SeriesFilter({
  series,
}: {
  series: { id: string; name: string; owned: number; read: number; authors: string[] }[];
}) {
  const [q, setQ] = useState("");
  const words = fold(q).split(/\s+/).filter(Boolean);
  const shown = series.filter((s) => words.every((w) => fold(`${s.name} ${s.authors.join(" ")}`).includes(w)));
  return (
    <>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${series.length} series`}
        aria-label="Search series"
        className={`mt-6 ${input}`}
      />
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
        {shown.map((s) => (
          <li key={s.id}>
            <Link href={`/series/${s.id}`} className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-accent-soft">
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium">{s.name}</span>
                {s.authors.length > 0 && <span className="block text-xs text-muted">{s.authors.join(", ")}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {s.owned} {s.owned === 1 ? "book" : "books"}
                {s.owned > 0 && ` · ${s.read} read`}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && <li className="px-4 py-3 text-sm text-muted">No series match that.</li>}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// A series page: rename or delete it.

export function SeriesSettings({ id, name, count }: { id: string; name: string; count: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "rename" | "delete">("closed");
  const [newName, setNewName] = useState(name);
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function rename() {
    setMessage(null);
    start(async () => {
      const r = await renameSeries(id, newName);
      if (!r.ok) return setMessage(r.error);
      setMode("closed");
    });
  }

  function remove() {
    setMessage(null);
    start(async () => {
      const r = await deleteSeries(id);
      if (!r.ok) return setMessage(r.error);
      router.push("/series");
    });
  }

  if (mode === "closed") {
    return (
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setMode("rename")} className={quiet}>
          Rename
        </button>
        <button type="button" onClick={() => setMode("delete")} className={quiet}>
          Delete series
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
      {mode === "rename" ? (
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Series name" className={input} />
          <button type="button" disabled={!newName.trim() || busy} onClick={rename} className={primary}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm">
            Delete the series &ldquo;{name}&rdquo;?{" "}
            {count > 0
              ? `Its ${count === 1 ? "book stays" : `${count} books stay`} in your library, just not in a series.`
              : "It has no books."}
          </p>
          <button type="button" disabled={busy} onClick={remove} className={`mt-2 ${primary}`}>
            {busy ? "Deleting…" : "Yes, delete it"}
          </button>
        </>
      )}
      <button type="button" onClick={() => setMode("closed")} className="mt-2 block text-sm text-muted underline-offset-4 hover:underline">
        Cancel
      </button>
      <Alert message={message} />
    </div>
  );
}

// One volume: change its number, or take it out of the series.

export function VolumeEdit({ titleId, series, number }: { titleId: string; series: string; number: number | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(number?.toString() ?? "");
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(remove: boolean) {
    setMessage(null);
    const n = parseNumber(value);
    if (!remove && n === undefined) return setMessage("Like 3 or 2.5.");
    start(async () => {
      const r = await setSeries(titleId, remove ? null : series, remove ? null : (n ?? null), null);
      if (!r.ok) return setMessage(r.error);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-9 shrink-0 rounded-full px-2 text-xs text-accent" aria-label="Change number">
        Edit
      </button>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Number in series"
          placeholder="#"
          className="w-14 rounded-lg border border-border bg-background px-2 py-1.5 text-base"
        />
        <button type="button" disabled={busy} onClick={() => save(false)} className="min-h-9 rounded-full bg-accent px-3 text-xs font-medium text-on-accent disabled:opacity-40">
          Save
        </button>
      </div>
      <button type="button" disabled={busy} onClick={() => save(true)} className="text-xs text-muted underline-offset-4 hover:underline">
        Remove from series
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline-offset-4 hover:underline">
        Cancel
      </button>
      <Alert message={message} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add book to series: search the library, pick a book, give it its number.
// Books by the same authors that aren't in any series are offered first.

export function AddToSeries({
  series,
  inSeries,
  authors,
  candidates,
  nextNumber,
}: {
  series: string;
  inSeries: string[];
  authors: string[];
  candidates: SeriesCandidate[];
  nextNumber: number;
}) {
  const [open, setOpen] = useState(inSeries.length === 0);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<SeriesCandidate | null>(null);
  const [number, setNumber] = useState("");
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const taken = useMemo(() => new Set(inSeries), [inSeries]);
  const suggestions = useMemo(() => {
    const mine = new Set(authors.map(fold));
    return candidates.filter((c) => !taken.has(c.id) && !c.series && c.authors.some((a) => mine.has(fold(a))));
  }, [authors, candidates, taken]);
  const words = fold(q).split(/\s+/).filter(Boolean);
  const results = words.length
    ? candidates.filter((c) => !taken.has(c.id) && words.every((w) => fold(`${c.title} ${c.authors.join(" ")}`).includes(w))).slice(0, 8)
    : [];

  function pick(c: SeriesCandidate) {
    setPicked(c);
    setNumber(numberIn(c.title) || nextNumber.toString());
    setMessage(null);
  }

  function add(c: SeriesCandidate, numberText: string, onDone?: () => void) {
    setMessage(null);
    const n = parseNumber(numberText);
    if (n === undefined) return setMessage("The number should be like 3 or 2.5, or left empty.");
    start(async () => {
      const r = await setSeries(c.id, series, n, null);
      if (!r.ok) return setMessage(r.error);
      setAdded(`${c.title}${n != null ? ` as #${n}` : ""}`);
      setPicked(null);
      setQ("");
      onDone?.();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`mt-4 ${primary}`}>
        + Add book to series
      </button>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-3" aria-label="Add book to series">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold">Add book to series</h2>
        {inSeries.length > 0 && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted underline-offset-4 hover:underline">
            Done
          </button>
        )}
      </div>
      {added && <p className="mt-1 text-sm text-muted">✓ Added {added}</p>}

      {picked ? (
        <div className="mt-3 rounded-xl border border-accent p-3">
          <p className="text-sm font-medium">{picked.title}</p>
          <p className="text-xs text-muted">{picked.authors.join(", ")}</p>
          {picked.series && (
            <p className="mt-1 text-xs text-muted">
              Now in {picked.series}
              {picked.number != null && ` #${picked.number}`}. Adding it moves it to this series.
            </p>
          )}
          <div className="mt-2 flex items-end gap-2">
            <label className="w-24 text-xs text-muted">
              Number
              <input
                inputMode="decimal"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                autoFocus
                className={`mt-1 ${input}`}
              />
            </label>
            <button type="button" disabled={busy} onClick={() => add(picked, number)} className={primary}>
              {busy ? "Adding…" : "Add"}
            </button>
            <button type="button" onClick={() => setPicked(null)} className={quiet}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your library by title or author"
            aria-label="Search your library"
            className={`mt-3 ${input}`}
          />
          {words.length > 0 && (
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => pick(c)} className="block w-full px-3 py-2 text-left hover:bg-accent-soft">
                    <span className="block text-sm">{c.title}</span>
                    <span className="block text-xs text-muted">
                      {c.authors.join(", ")}
                      {c.series && ` · in ${c.series}${c.number != null ? ` #${c.number}` : ""}`}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No books in your library match that.</li>}
            </ul>
          )}
        </>
      )}
      <Alert message={message} />

      {!picked && suggestions.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">
            By {authors.slice(0, 2).join(" and ")}, not in a series yet ({suggestions.length})
          </h3>
          <p className="text-xs text-muted">Check the number, then tap Add.</p>
          <ul className="mt-2 space-y-2">
            {suggestions.map((c) => (
              <SuggestionRow key={c.id} book={c} guess={numberIn(c.title)} busy={busy} onAdd={(n) => add(c, n)} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SuggestionRow({
  book,
  guess,
  busy,
  onAdd,
}: {
  book: SeriesCandidate;
  guess: string;
  busy: boolean;
  onAdd: (number: string) => void;
}) {
  const [number, setNumber] = useState(guess);
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
      <span className="min-w-0 flex-1 text-sm">{book.title}</span>
      <input
        inputMode="decimal"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        aria-label={`Number for ${book.title}`}
        placeholder="#"
        className="w-14 shrink-0 rounded-lg border border-border bg-background px-2 py-1.5 text-base"
      />
      <button type="button" disabled={busy} onClick={() => onAdd(number)} className="min-h-9 shrink-0 rounded-full bg-accent px-3 text-xs font-medium text-on-accent disabled:opacity-40">
        Add
      </button>
    </li>
  );
}
