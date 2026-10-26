"use client";

import { useRef, useState } from "react";
import type { CopyFormat, CopySource } from "@/lib/library";
import { AUDIO, RECOMMEND, STARS, WRITING, find, starText, type Recommendation } from "@/lib/ratings";
import {
  setAudioReview,
  setKeepsake,
  setLoan,
  setPieceRead,
  setPrintType,
  setReadStatus,
  setReference,
  setReview,
} from "@/app/edit-actions";

export type EditableCopy = {
  id: string;
  format: CopyFormat;
  source: CopySource;
  onLoanTo: string | null;
  keepsakeNotes: string | null;
  audioPerformance: number | null;
  audioNote: string | null;
};

export type EditableBook = {
  id: string;
  title: string;
  readStatus: "unread" | "partly_read" | "read";
  rating: number | null;
  writingQuality: number | null;
  recommendation: Recommendation | null;
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

      <Row label="Stars">
        <StarPicker
          key={String(book.rating)}
          value={book.rating}
          onChange={(rating) =>
            apply(
              (b) => (rating === null ? { ...b, rating, writingQuality: null, recommendation: null } : { ...b, rating }),
              () => setReview(book.id, { rating }),
            )
          }
        />
      </Row>

      {book.rating !== null && (
        <>
          <Row label="Writing quality" note="optional">
            <ScalePicker
              scale={WRITING}
              value={book.writingQuality}
              numbered
              onChange={(writingQuality) =>
                apply((b) => ({ ...b, writingQuality }), () => setReview(book.id, { writingQuality }))
              }
            />
          </Row>
          <Row label="Would I recommend it?" note="optional">
            <ScalePicker
              scale={RECOMMEND}
              value={book.recommendation}
              onChange={(recommendation) =>
                apply((b) => ({ ...b, recommendation }), () => setReview(book.id, { recommendation }))
              }
            />
          </Row>
        </>
      )}

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

          {c.format === "audiobook" && (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted">Audio performance</span> <span className="text-xs text-muted">(optional)</span>
              </p>
              <ScalePicker
                scale={AUDIO}
                value={c.audioPerformance}
                numbered
                onChange={(audioPerformance) =>
                  apply(updateCopy(c.id, { audioPerformance }), () => setAudioReview(c.id, audioPerformance, c.audioNote))
                }
              />
              <TextField
                label="Narration note"
                placeholder="Voices, pacing, accents…"
                value={c.audioNote}
                onSave={(audioNote) =>
                  apply(updateCopy(c.id, { audioNote }), () => setAudioReview(c.id, c.audioPerformance, audioNote))
                }
              />
            </div>
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

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">
        {label}
        {note && <span className="font-normal text-muted"> ({note})</span>}
      </p>
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

// Stars, in two taps: pick 1–5 stars, then the quarter within that star
// (4.00 Loved it, 4.25 A great book…). Each choice shows her label and
// description.
function StarPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [star, setStar] = useState<number | null>(value === null ? null : Math.floor(value));
  const current = find(STARS, value);
  const quarters = star === null ? [] : STARS.filter((s) => Math.floor(s.value) === star).reverse();

  function pickStar(n: number) {
    setStar(n);
    // Tapping a star rates it a whole star; the quarters refine it.
    if (value === null || Math.floor(value) !== n) onChange(n);
  }

  return (
    <div>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = value === null ? 0 : Math.max(0, Math.min(1, value - (n - 1)));
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={star === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => pickStar(n)}
              className="relative size-11 text-4xl leading-[2.75rem]"
            >
              <span aria-hidden className="absolute inset-0 text-border">★</span>
              <span aria-hidden className="absolute inset-0 overflow-hidden text-accent" style={{ width: `${fill * 100}%` }}>
                ★
              </span>
            </button>
          );
        })}
      </div>

      {current ? (
        <p className="mt-1 text-sm">
          <strong>{starText(current.value)}</strong> · {current.label}
          <button
            type="button"
            onClick={() => {
              setStar(null);
              onChange(null);
            }}
            className="ml-3 text-xs text-accent underline-offset-4 hover:underline"
          >
            Clear
          </button>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Not rated. Tap a star.</p>
      )}

      {quarters.length > 1 && (
        <ul className="mt-2 space-y-1.5" role="radiogroup" aria-label={`Within ${star} stars`}>
          {quarters.map((q) => (
            <li key={q.value}>
              <button
                type="button"
                role="radio"
                aria-checked={value === q.value}
                onClick={() => value !== q.value && onChange(q.value)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  value === q.value ? "border-accent bg-accent-soft" : "border-border bg-background"
                }`}
              >
                <span className="font-medium">
                  {starText(q.value)} · {q.label}
                </span>
                <span className="block text-xs text-muted">{q.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {quarters.length === 1 && current && <p className="mt-1 text-xs text-muted">{current.description}</p>}
    </div>
  );
}

// One-tap scales (writing quality, recommendation, audio). Tapping the chosen
// value again clears it. The chosen value's description shows underneath.
function ScalePicker<K extends string | number>({
  scale,
  value,
  numbered,
  onChange,
}: {
  scale: { value: K; label: string; description: string }[];
  value: K | null;
  numbered?: boolean;
  onChange: (v: K | null) => void;
}) {
  const options = numbered ? [...scale].reverse() : scale;
  const chosen = scale.find((s) => s.value === value);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}
            className={`min-h-10 rounded-full border px-3.5 text-sm ${
              value === o.value ? "border-accent bg-accent text-on-accent" : "border-border bg-background"
            }`}
          >
            {numbered && <span className="font-semibold">{o.value} </span>}
            {o.label}
          </button>
        ))}
      </div>
      {chosen && <p className="mt-1.5 text-xs text-muted">{chosen.description}</p>}
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
