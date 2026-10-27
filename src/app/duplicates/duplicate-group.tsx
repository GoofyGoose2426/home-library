"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { mergeTitles } from "@/app/edit-actions";

type Entry = { id: string; title: string; authors: string; copies: string; series: string | null; readStatus: string };

export function DuplicateGroup({ books }: { books: Entry[] }) {
  const router = useRouter();
  const [keep, setKeep] = useState<Entry | null>(null);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const others = keep ? books.filter((b) => b.id !== keep.id) : [];

  function merge() {
    setMessage(null);
    startBusy(async () => {
      for (const o of others) {
        const r = await mergeTitles(keep!.id, o.id);
        if (!r.ok) return setMessage(r.error);
      }
      setMessage(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <ul className="space-y-2">
        {books.map((b) => (
          <li key={b.id} className={`rounded-xl p-2 ${keep?.id === b.id ? "bg-accent-soft" : ""}`}>
            <Link href={`/books/${b.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
              {b.title}
            </Link>
            <span className="block text-xs text-muted">
              {[b.authors, b.series, b.copies, b.readStatus === "read" ? "Read" : null].filter(Boolean).join(" · ")}
            </span>
            {!keep && (
              <button
                type="button"
                onClick={() => setKeep(b)}
                className="mt-1.5 min-h-9 rounded-full border border-border px-4 text-xs hover:bg-accent-soft"
              >
                Keep this one
              </button>
            )}
          </li>
        ))}
      </ul>
      {keep && (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            Merge {others.length === 1 ? "the other entry" : `the other ${others.length}`} into <strong>{keep.title}</strong>? Its
            details win where both have one; read in either means read.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={merge}
              className="min-h-10 rounded-full bg-accent px-5 text-sm font-medium text-on-accent disabled:opacity-60"
            >
              {busy ? "Merging…" : "Yes, merge"}
            </button>
            <button type="button" disabled={busy} onClick={() => setKeep(null)} className="min-h-10 rounded-full border border-border px-4">
              Back
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="alert" className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
