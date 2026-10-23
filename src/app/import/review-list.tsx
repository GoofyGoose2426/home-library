"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { DecidedValue, Decision } from "@/lib/import/decisions";
import type { SaveResult } from "@/lib/import/save";
import { decide, saveLibrary } from "./actions";

export type ReviewRow = {
  key: string;
  kind: "title_uncertain" | "match_uncertain" | "status_conflict" | "status_needed";
  note: string | null;
  title: string;
  authors: string[];
  where: string | null;
  decision: "pending" | "accepted" | "edited" | "skipped";
  value: DecidedValue | null;
};

const SECTIONS: { kind: ReviewRow["kind"]; heading: string; intro: string }[] = [
  {
    kind: "status_needed",
    heading: "Libro.fm audiobooks",
    intro: "Libro.fm doesn't say whether you've finished these. Tap Read or Unread.",
  },
  { kind: "status_conflict", heading: "Read or unread?", intro: "Your formats disagree on these." },
  { kind: "match_uncertain", heading: "Possible duplicate", intro: "Is this one book or two?" },
  {
    kind: "title_uncertain",
    heading: "Check these books",
    intro: "Spines I couldn't read clearly. Fix what you know; anything you keep as is stays flagged for later.",
  },
];

export function ReviewList({
  rows: initial,
  savedSummary,
}: {
  rows: ReviewRow[];
  savedSummary: SaveResult | null;
}) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(savedSummary);

  const pending = rows.filter((r) => r.decision === "pending").length;

  function choose(keys: string[], d: Decision | null) {
    const before = rows;
    setError(null);
    setRows((rs) =>
      rs.map((r) =>
        keys.includes(r.key)
          ? { ...r, decision: d?.decision ?? "pending", value: d?.value ?? null }
          : r,
      ),
    );
    decide(keys, d).catch(() => {
      setRows(before);
      setError("Couldn't save that choice. Check your connection and try again.");
    });
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await saveLibrary();
      if (res.ok) setResult(res.result);
      else setError(res.error);
    });
  }

  if (result) {
    return (
      <div className="mt-8 rounded-3xl border border-border bg-surface p-6 text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-2 font-serif text-2xl font-semibold">Your library is saved</h2>
        <p className="mt-2 text-muted">
          {result.titlesAdded.toLocaleString()} books with {result.copiesAdded.toLocaleString()} copies.
          {result.skipped > 0 && ` ${result.skipped} left out, as you chose.`}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent"
        >
          Go to my library
        </Link>
      </div>
    );
  }

  return (
    <>
      {SECTIONS.map((section) => {
        const items = rows.filter((r) => r.kind === section.kind);
        if (!items.length) return null;
        const open = items.filter((r) => r.decision === "pending");
        return (
          <section key={section.kind} className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl font-semibold">{section.heading}</h2>
              <span className="text-sm text-muted">
                {items.length - open.length} of {items.length} done
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{section.intro}</p>
            {section.kind === "status_needed" && open.length > 1 && (
              <div className="mt-3 flex gap-2 text-sm">
                <span className="self-center text-muted">All remaining:</span>
                <Pill onClick={() => choose(open.map((r) => r.key), status("read"))}>Read</Pill>
                <Pill onClick={() => choose(open.map((r) => r.key), status("unread"))}>Unread</Pill>
              </div>
            )}
            <ul className="mt-3 space-y-3">
              {items.map((row) => (
                <li key={row.key}>
                  <ItemCard row={row} onChoose={(d) => choose([row.key], d)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {error && (
            <p role="alert" className="rounded-2xl bg-accent-soft px-4 py-2 text-sm">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm">
              {pending ? (
                <>
                  <strong>{pending}</strong> left to check
                </>
              ) : (
                "All checked. Ready to save."
              )}
            </p>
            <button
              type="button"
              onClick={save}
              disabled={pending > 0 || saving}
              className="rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent disabled:opacity-50"
            >
              {saving ? "Saving… (about a minute)" : "Save my library"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const status = (read_status: "read" | "unread"): Decision => ({ decision: "accepted", value: { read_status } });

function ItemCard({ row, onChoose }: { row: ReviewRow; onChoose: (d: Decision | null) => void }) {
  const [editing, setEditing] = useState(false);
  const done = row.decision !== "pending";

  return (
    <div
      className={`rounded-2xl border p-4 ${done ? "border-border bg-background" : "border-accent/40 bg-surface"}`}
    >
      <p className="font-medium">{row.title}</p>
      {row.authors.length > 0 && <p className="text-sm text-muted">{row.authors.join(", ")}</p>}
      {row.kind !== "status_needed" && row.note && <p className="mt-2 text-sm">{row.note}</p>}
      {row.where && row.kind === "title_uncertain" && (
        <p className="mt-1 text-xs text-muted">Shelf: {row.where}</p>
      )}

      {done ? (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span className="rounded-full bg-accent-soft px-3 py-1">{describe(row)}</span>
          <button type="button" onClick={() => onChoose(null)} className="text-accent underline-offset-4 hover:underline">
            Change
          </button>
        </div>
      ) : editing ? (
        <EditForm
          row={row}
          onCancel={() => setEditing(false)}
          onSave={(title, authors) => {
            setEditing(false);
            onChoose({ decision: "edited", value: { title, authors } });
          }}
        />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {(row.kind === "status_needed" || row.kind === "status_conflict") && (
            <>
              <Pill onClick={() => onChoose(status("read"))}>Read</Pill>
              <Pill onClick={() => onChoose(status("unread"))}>Unread</Pill>
            </>
          )}
          {row.kind === "match_uncertain" && (
            <>
              <Pill onClick={() => onChoose({ decision: "accepted", value: { merge: true } })}>Same book</Pill>
              <Pill onClick={() => onChoose({ decision: "accepted", value: { merge: false } })}>
                Two different books
              </Pill>
            </>
          )}
          {row.kind === "title_uncertain" && (
            <>
              <Pill onClick={() => setEditing(true)}>Fix title or author</Pill>
              <Pill onClick={() => onChoose({ decision: "accepted", value: { keep_flagged: true } })}>
                Keep, check later
              </Pill>
              <Pill onClick={() => onChoose({ decision: "skipped", value: { skip: true } })}>
                Don&apos;t add
              </Pill>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function describe(row: ReviewRow) {
  const v = (row.value ?? {}) as Record<string, unknown>;
  if (row.decision === "skipped") return "Won't be added";
  if (row.decision === "edited") return `Fixed: ${v.title}`;
  if (v.read_status === "read") return "Read";
  if (v.read_status === "unread") return "Unread";
  if (v.keep_flagged) return "Keep, check later";
  if (v.merge === true) return "Same book";
  if (v.merge === false) return "Two different books";
  return "Done";
}

function EditForm({
  row,
  onCancel,
  onSave,
}: {
  row: ReviewRow;
  onCancel: () => void;
  onSave: (title: string, authors: string[]) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [authors, setAuthors] = useState(row.authors.join(", "));
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(title.trim(), authors.split(",").map((a) => a.trim()).filter(Boolean));
      }}
    >
      <label className="block text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
        />
      </label>
      <label className="block text-sm">
        Author(s), separated by commas
        <input
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent">
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Pill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-accent-soft"
    >
      {children}
    </button>
  );
}
