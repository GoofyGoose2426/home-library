"use client";

import { useState, useTransition } from "react";
import { clearReview } from "@/app/edit-actions";

// The ⚑ Needs review box on a book page: what's flagged, how to fix it, and
// "It's fine as it is" to clear a flag without changing the book.

export type ReviewReason = "cover" | "author" | "guess";

const WHAT: Record<ReviewReason, { title: string; fix: string; cleared: string }> = {
  cover: {
    title: "No cover",
    fix: "Add one with the cover button under the picture, or clear this if the book doesn't need one.",
    cleared: "no cover needed",
  },
  author: {
    title: "No author",
    fix: "Add one with Edit details below, or clear this if the book has no author (a colouring book, say).",
    cleared: "no author needed",
  },
  guess: {
    title: "Title or author was a guess",
    fix: "It was hard to read in the shelf photos. Check the title and author, fix them in Edit details if needed, then clear this.",
    cleared: "",
  },
};

export function NeedsReview({
  titleId,
  reasons,
  cleared,
  checkNote,
}: {
  titleId: string;
  reasons: ReviewReason[];
  cleared: ("cover" | "author")[];
  checkNote: string | null;
}) {
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function act(which: ReviewReason[], undo = false) {
    setMessage(null);
    start(async () => {
      const r = await clearReview(titleId, which, undo);
      if (!r.ok) setMessage(r.error);
    });
  }

  if (!reasons.length && !cleared.length) return null;

  return (
    <div className="mt-4">
      {reasons.length > 0 && (
        <section aria-label="Needs review" className="rounded-2xl border border-accent bg-accent-soft px-4 py-3 text-sm">
          <p className="font-semibold">⚑ Needs review</p>
          <ul className="mt-2 space-y-3">
            {reasons.map((r) => (
              <li key={r}>
                <p className="font-medium">{WHAT[r].title}</p>
                <p className="mt-0.5 text-muted">{r === "guess" && checkNote ? `${checkNote} ` : ""}{WHAT[r].fix}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act([r])}
                  className="mt-1.5 min-h-9 rounded-full border border-accent bg-surface px-3 text-xs font-medium text-accent disabled:opacity-40"
                >
                  {r === "guess" ? "It's right, clear this" : "It's fine as it is, clear this"}
                </button>
              </li>
            ))}
          </ul>
          {reasons.length > 1 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(reasons)}
              className="mt-3 min-h-9 rounded-full bg-accent px-4 text-xs font-medium text-on-accent disabled:opacity-40"
            >
              No issues, clear all
            </button>
          )}
        </section>
      )}
      {cleared.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          You cleared: {cleared.map((c) => WHAT[c].cleared).join(", ")}.{" "}
          <button type="button" disabled={busy} onClick={() => act(cleared, true)} className="text-accent underline-offset-4 hover:underline">
            Flag it again
          </button>
        </p>
      )}
      {message && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}
