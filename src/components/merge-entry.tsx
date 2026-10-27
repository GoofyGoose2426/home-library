"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { findMergeCandidates, mergeTitles, type MergeCandidate } from "@/app/edit-actions";

// "Merge a duplicate into this book": find the other entry by title, check,
// merge. This book's details win where both have one.
export function MergeEntry({ titleId, title }: { titleId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(title.replace(/\(.*?\)/g, "").trim());
  const [found, setFound] = useState<MergeCandidate[] | null>(null);
  const [picked, setPicked] = useState<MergeCandidate | null>(null);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function search() {
    setMessage(null);
    startBusy(async () => {
      const r = await findMergeCandidates(q, titleId);
      if (!r.ok) return setMessage(r.error);
      setFound(r.books);
      if (!r.books.length) setMessage("No other entry has that in its title. Try fewer words.");
    });
  }

  function merge() {
    if (!picked) return;
    setMessage(null);
    startBusy(async () => {
      const r = await mergeTitles(titleId, picked.id);
      if (!r.ok) return setMessage(r.error);
      setOpen(false);
      setPicked(null);
      setFound(null);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-accent underline-offset-4 hover:underline">
        Same book entered twice? Merge it into this one
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Merge a duplicate into this book</p>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          Cancel
        </button>
      </div>
      {picked ? (
        <div className="space-y-3 text-sm">
          <p>
            Merge <strong>{picked.title}</strong>
            {picked.copies.length > 0 && ` (${picked.copies.join(", ")})`} into <strong>{title}</strong>?
          </p>
          <p className="text-muted">
            Its copies, genres, tags, rating and details move here. Where both have a value, this book&apos;s wins. Read in
            either means read. The other entry is then removed.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={merge}
              className="min-h-10 rounded-full bg-accent px-5 text-sm font-medium text-on-accent disabled:opacity-60"
            >
              {busy ? "Merging…" : "Yes, merge"}
            </button>
            <button type="button" disabled={busy} onClick={() => setPicked(null)} className="min-h-10 rounded-full border border-border px-4">
              Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Title of the other entry"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-base"
            />
            <button type="submit" disabled={busy || q.trim().length < 2} className="min-h-11 rounded-xl border border-border px-3 text-sm disabled:opacity-50">
              Find
            </button>
          </form>
          {found && found.length > 0 && (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {found.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setPicked(b)} className="w-full px-3 py-2 text-left text-sm hover:bg-accent-soft">
                    <span className="font-medium">{b.title}</span>
                    <span className="block text-xs text-muted">
                      {[b.authors.join(", "), b.copies.join(", ") || "No copies owned"].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {message && (
        <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
