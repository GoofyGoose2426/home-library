"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setSeries } from "@/app/edit-actions";

export type SeriesRowBook = {
  id: string;
  title: string;
  options: string[];
  suggested: string | null;
  number: number | null;
  tidyTitle: string | null;
};

const NONE = "__none";
const OTHER = "__other";

export function SeriesRow({ book }: { book: SeriesRowBook }) {
  const [choice, setChoice] = useState(book.suggested ?? "");
  const [other, setOther] = useState("");
  const [number, setNumber] = useState(book.number?.toString() ?? "");
  const [tidy, setTidy] = useState(!!book.tidyTitle && !!book.suggested);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const series = choice === NONE ? null : choice === OTHER ? other.trim() : choice;
  const canSave = choice !== "" && (choice !== OTHER || other.trim().length > 0);

  function save() {
    setMessage(null);
    startBusy(async () => {
      const n = number.trim() === "" ? null : Number(number);
      if (n !== null && !Number.isFinite(n)) return setMessage("The number should be like 3 or 2.5.");
      const r = await setSeries(book.id, series, series ? n : null, tidy && book.tidyTitle ? book.tidyTitle : null);
      if (!r.ok) return setMessage(r.error);
      setSaved(series ? `${series}${n != null ? ` #${n}` : ""}` : "Not in a series");
    });
  }

  if (saved) {
    return (
      <p className="rounded-xl border border-border px-3 py-2 text-sm text-muted">
        ✓ {tidy && book.tidyTitle ? book.tidyTitle : book.title} · {saved}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <Link href={`/books/${book.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
        {book.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs text-muted">
          Series
          <select
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-2 py-2 text-base text-foreground"
          >
            <option value="">Choose…</option>
            {book.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER}>Another series…</option>
            <option value={NONE}>Not in a series</option>
          </select>
        </label>
        {choice !== NONE && (
          <label className="w-20 text-xs text-muted">
            Number
            <input
              inputMode="decimal"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-2 py-2 text-base text-foreground"
            />
          </label>
        )}
        <button
          type="button"
          disabled={!canSave || busy}
          onClick={save}
          className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {choice === OTHER && (
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Series name"
          aria-label="Series name"
          className="mt-2 block w-full rounded-lg border border-border bg-background px-2 py-2 text-base"
        />
      )}
      {book.tidyTitle && choice !== NONE && (
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={tidy} onChange={(e) => setTidy(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Also rename to &ldquo;{book.tidyTitle}&rdquo;
        </label>
      )}
      {message && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}
