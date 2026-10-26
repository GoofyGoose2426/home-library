"use client";

import { useRef, useState } from "react";
import type { CopyFormat, CopySource } from "@/lib/library";
import { starLabel } from "@/lib/ratings";
import {
  setKeepsake,
  setLoan,
  setPieceRead,
  setPrintType,
  setRating,
  setReadStatus,
  setReference,
} from "@/app/edit-actions";

export type EditableCopy = {
  id: string;
  format: CopyFormat;
  source: CopySource;
  onLoanTo: string | null;
  keepsakeNotes: string | null;
};

export type EditableBook = {
  id: string;
  title: string;
  readStatus: "unread" | "partly_read" | "read";
  rating: number | null;
  isReference: boolean;
  pieces?: { id: string; title: string; isRead: boolean }[];
  pieceCount: number;
  copies: EditableCopy[];
};

const PRINT_TYPES: [CopyFormat, string][] = [
  ["print_unknown", "Type not set"],
  ["hardcover", "Hardcover"],
  ["trade_paperback", "Trade paperback"],
  ["mass_market", "Mass-market"],
];
const DIGITAL_LABEL: Record<string, string> = { kobo: "Kobo", audible: "Audible", librofm: "Libro.fm", other: "Other" };

function copyName(c: EditableCopy) {
  if (c.format === "ebook" || c.format === "audiobook") {
    return `${DIGITAL_LABEL[c.source] ?? "Other"} ${c.format}`;
  }
  return "Bookshelf copy";
}

export function QuickEdit({
  book: initial,
  onChange,
}: {
  book: EditableBook;
  onChange?: (book: EditableBook) => void;
}) {
  const [book, setBook] = useState(initial);
  const latest = useRef(initial);
  const [error, setError] = useState<string | null>(null);

  // Show the change at once, save it, and undo it if saving fails. Changes
  // build on the latest state, so a delayed save can't undo a newer edit.
  function apply(update: (b: EditableBook) => EditableBook, save: () => Promise<unknown>) {
    const before = latest.current;
    const next = update(before);
    latest.current = next;
    setError(null);
    setBook(next);
    onChange?.(next);
    save().catch((e: unknown) => {
      latest.current = before;
      setBook(before);
      onChange?.(before);
      setError(e instanceof Error && e.message !== "Not signed in." ? e.message : "Couldn't save that. Check your connection and try again.");
    });
  }

  const isCollection = book.pieceCount > 0;
  const updateCopy = (id: string, patch: Partial<EditableCopy>) => (b: EditableBook) => ({
    ...b,
    copies: b.copies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          {error}
        </p>
      )}

      <Row label="Status">
        {isCollection ? (
          <p className="text-sm text-muted">
            {book.readStatus === "read" ? "Read" : book.readStatus === "partly_read" ? "Partly read" : "Unread"}
            {" · "}tick the pieces to update it
          </p>
        ) : (
          <div className="flex gap-2">
            {(["unread", "read"] as const).map((s) => (
              <Toggle
                key={s}
                on={book.readStatus === s}
                onClick={() => book.readStatus !== s && apply((b) => ({ ...b, readStatus: s }), () => setReadStatus(book.id, s))}
              >
                {s === "read" ? "Read" : "Unread"}
              </Toggle>
            ))}
          </div>
        )}
      </Row>

      <Row label="Rating">
        <StarRating
          key={String(book.rating)}
          value={book.rating}
          onChange={(rating) => apply((b) => ({ ...b, rating }), () => setRating(book.id, rating))}
        />
      </Row>

      {book.pieces && book.pieces.length > 0 && (
        <Row label={`Pieces (${book.pieces.filter((p) => p.isRead).length} of ${book.pieces.length} read)`}>
          <ul className="space-y-1">
            {book.pieces.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-9 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={p.isRead}
                    onChange={(e) => {
                      const isRead = e.target.checked;
                      apply(
                        (b) => {
                          const pieces = (b.pieces ?? []).map((x) => (x.id === p.id ? { ...x, isRead } : x));
                          const done = pieces.filter((x) => x.isRead).length;
                          const readStatus = done === 0 ? "unread" : done === pieces.length ? "read" : "partly_read";
                          return { ...b, pieces, readStatus };
                        },
                        () => setPieceRead(p.id, isRead),
                      );
                    }}
                    className="size-5 accent-[var(--accent)]"
                  />
                  {p.title}
                </label>
              </li>
            ))}
          </ul>
        </Row>
      )}

      {book.copies.map((c) => (
        <fieldset key={c.id} className="space-y-3 rounded-2xl border border-border p-3">
          <legend className="px-1 text-sm font-medium">{copyName(c)}</legend>

          {c.source === "shelf" && (
            <label className="block text-sm">
              <span className="text-muted">Print type</span>
              <select
                value={c.format}
                onChange={(e) => {
                  const format = e.target.value as CopyFormat;
                  apply(updateCopy(c.id, { format }), () =>
                    setPrintType([c.id], format as "hardcover" | "trade_paperback" | "mass_market" | "print_unknown"),
                  );
                }}
                className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
              >
                {PRINT_TYPES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {c.source === "shelf" && (
            <LoanField
              value={c.onLoanTo}
              onSave={(name) => apply(updateCopy(c.id, { onLoanTo: name }), () => setLoan(c.id, name))}
            />
          )}

          <TextField
            label="Keepsake notes"
            placeholder="Signed, heirloom, gift from…"
            value={c.keepsakeNotes}
            onSave={(notes) => apply(updateCopy(c.id, { keepsakeNotes: notes }), () => setKeepsake(c.id, notes))}
          />
        </fieldset>
      ))}

      <Row label="Reference">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={book.isReference}
            onChange={(e) => {
              const isReference = e.target.checked;
              apply((b) => ({ ...b, isReference }), () => setReference(book.id, isReference));
            }}
            className="mt-0.5 size-5 accent-[var(--accent)]"
          />
          <span>
            Reference book
            <span className="block text-xs text-muted">Stays in your catalog but is left out of read/unread stats.</span>
          </span>
        </label>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-5 text-sm ${on ? "border-accent bg-accent text-on-accent" : "border-border bg-background"}`}
    >
      {children}
    </button>
  );
}

// Quarter-star rating. Tap a star for a whole number, or slide for quarters.
function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value ?? 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = draft;

  function commit(v: number) {
    setDraft(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v === 0 ? null : v), 400);
  }

  return (
    <div>
      <div className="flex items-center gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = Math.max(0, Math.min(1, shown - (n - 1)));
          return (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              onClick={() => commit(n)}
              className="relative size-9 text-3xl leading-9"
            >
              <span className="absolute inset-0 text-border">★</span>
              <span className="absolute inset-0 overflow-hidden text-accent" style={{ width: `${fill * 100}%` }}>
                ★
              </span>
            </button>
          );
        })}
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={0.25}
        value={shown}
        onChange={(e) => commit(Number(e.target.value))}
        aria-label="Rating in quarter stars"
        aria-valuetext={shown ? `${shown} stars` : "Not rated"}
        className="mt-1 w-full max-w-xs accent-[var(--accent)]"
      />
      <p className="text-sm">
        {shown ? (
          <>
            <strong>{shown}</strong> · {starLabel(shown)}
            <button type="button" onClick={() => commit(0)} className="ml-3 text-xs text-accent underline-offset-4 hover:underline">
              Clear
            </button>
          </>
        ) : (
          <span className="text-muted">Not rated</span>
        )}
      </p>
    </div>
  );
}

function LoanField({ value, onSave }: { value: string | null; onSave: (name: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="text-muted">On loan to</span> <strong>{value}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onSave(null);
          }}
          className="min-h-9 rounded-full border border-border px-4"
        >
          Returned
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) onSave(draft.trim());
      }}
    >
      <label className="min-w-0 flex-1 text-sm">
        <span className="text-muted">On loan to</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Name"
          maxLength={80}
          className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
        />
      </label>
      <button
        type="submit"
        disabled={!draft.trim()}
        className="min-h-11 rounded-xl bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
      >
        Lend
      </button>
    </form>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <textarea
        value={draft}
        rows={2}
        maxLength={1000}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft.trim() || null;
          if (next !== (value ?? null)) onSave(next);
        }}
        className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
      />
    </label>
  );
}
