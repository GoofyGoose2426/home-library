"use client";

import { useState, useTransition } from "react";
import { addPieces, removePiece, setPieceRead, setPieceReview, type PieceInput } from "@/app/edit-actions";
import { StarPicker } from "@/components/quick-edit";
import { STARS, find, starText } from "@/lib/ratings";

// A collection's contents: its stories, essays or poems in order, each with a
// read tick and an optional short review. The collection's overall review is
// the book's Review section. The book is Read when every piece is ticked,
// Partly read when some are.

type Piece = { id: string; title: string; kind: string; isRead: boolean; authors: string[]; rating: number | null; note: string | null };

const KINDS: [PieceInput["kind"], string, string][] = [
  ["story", "Story", "stories"],
  ["essay", "Essay", "essays"],
  ["poem", "Poem", "poems"],
  ["other", "Other", "pieces"],
];

const box = "block w-full rounded-lg border border-border bg-background px-3 py-2 text-base";

// "The Ones Who Walk Away from Omelas — Ursula K. Le Guin". Only a dash with
// spaces around it splits off the author, so titles like "Stand by Me" stay whole.
function parseLines(text: string, kind: PieceInput["kind"]): PieceInput[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s+(?:[—–]|-{1,2})\s+(.+)$/);
      const title = (m ? m[1] : line).trim();
      const authors = m ? m[2].split(/\s*(?:,|&|\band\b)\s*/i).map((a) => a.trim()).filter(Boolean) : [];
      return { title, kind, authors };
    });
}

export function BookContents({ titleId, pieces, readOnly = false }: { titleId: string; pieces: Piece[]; readOnly?: boolean }) {
  const [adding, setAdding] = useState(false);
  if (readOnly && !pieces.length) return null;
  const read = pieces.filter((p) => p.isRead).length;

  return (
    <div>
      {pieces.length > 0 && (
        <>
          <p className="mb-2 text-sm text-muted">
            {read} of {pieces.length} read
          </p>
          <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {pieces.map((p, i) => (
              <PieceRow key={p.id} piece={p} index={i + 1} readOnly={readOnly} />
            ))}
          </ol>
        </>
      )}
      {!readOnly &&
        (adding ? (
          <AddContents titleId={titleId} hasPieces={pieces.length > 0} onDone={() => setAdding(false)} />
        ) : (
          <div className="mt-3">
            {!pieces.length && (
              <p className="mb-2 text-sm text-muted">
                Is this a collection or anthology? Add its stories, essays or poems to tick them off one by one and review each.
              </p>
            )}
            <button type="button" onClick={() => setAdding(true)} className="min-h-10 rounded-full border border-accent px-4 text-sm font-medium text-accent">
              {pieces.length ? "+ Add more" : "+ Add contents"}
            </button>
          </div>
        ))}
    </div>
  );
}

function PieceRow({ piece, index, readOnly }: { piece: Piece; index: number; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const [isRead, setIsRead] = useState(piece.isRead);
  const [rating, setRating] = useState(piece.rating);
  const [note, setNote] = useState(piece.note ?? "");
  const [savedNote, setSavedNote] = useState(piece.note ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const stars = find(STARS, rating);

  function run(work: () => Promise<{ ok: boolean; error?: string } | unknown>, undo?: () => void) {
    setMessage(null);
    start(async () => {
      try {
        const r = (await work()) as { ok?: boolean; error?: string } | undefined;
        if (r && r.ok === false) {
          undo?.();
          setMessage(r.error ?? "Couldn't save that.");
        }
      } catch (e) {
        undo?.();
        setMessage(e instanceof Error ? e.message : "Couldn't save that.");
      }
    });
  }

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-3">
        {readOnly ? (
          <span className="mt-0.5 w-5 shrink-0 text-center text-sm text-muted" aria-label={isRead ? "Read" : "Not read"}>
            {isRead ? "✓" : index}
          </span>
        ) : (
          <input
            type="checkbox"
            checked={isRead}
            disabled={busy}
            onChange={(e) => {
              const next = e.target.checked;
              setIsRead(next);
              run(() => setPieceRead(piece.id, next), () => setIsRead(!next));
            }}
            aria-label={`Read ${piece.title}`}
            className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{piece.title}</p>
          <p className="text-xs text-muted">
            {piece.authors.join(", ")}
            {piece.authors.length > 0 && piece.kind !== "story" && " · "}
            {piece.kind !== "story" && KINDS.find((k) => k[0] === piece.kind)?.[1]}
          </p>
          {stars && (
            <p className="mt-0.5 text-xs">
              <span className="text-accent">★</span> {starText(stars.value)} · {stars.label}
            </p>
          )}
          {readOnly && piece.note && <p className="mt-1 whitespace-pre-line text-sm">{piece.note}</p>}
        </div>
        {!readOnly && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="min-h-9 shrink-0 px-1 text-xs text-accent">
            {open ? "Close" : rating || savedNote ? "Review" : "Review it"}
          </button>
        )}
      </div>

      {open && !readOnly && (
        <div className="mt-3 space-y-3 pl-8">
          <StarPicker
            value={rating}
            onChange={(v) => {
              const before = rating;
              setRating(v);
              run(() => setPieceReview(piece.id, { rating: v }), () => setRating(before));
            }}
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={10000}
            aria-label={`Short review of ${piece.title}`}
            placeholder="A few words on this one (optional)"
            className={box}
          />
          {note !== savedNote && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const text = note;
                run(async () => {
                  const r = await setPieceReview(piece.id, { body: text });
                  if (r.ok) setSavedNote(text);
                  return r;
                });
              }}
              className="min-h-9 rounded-full bg-accent px-4 text-xs font-medium text-on-accent disabled:opacity-40"
            >
              Save
            </button>
          )}
          <div>
            {confirmRemove ? (
              <p className="text-xs">
                Remove &ldquo;{piece.title}&rdquo; from the contents?{" "}
                <button type="button" disabled={busy} onClick={() => run(() => removePiece(piece.id))} className="font-medium text-accent underline-offset-4 hover:underline">
                  Yes, remove
                </button>{" "}
                <button type="button" onClick={() => setConfirmRemove(false)} className="text-muted underline-offset-4 hover:underline">
                  Cancel
                </button>
              </p>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className="text-xs text-muted underline-offset-4 hover:underline">
                Remove from contents
              </button>
            )}
          </div>
        </div>
      )}
      {message && (
        <p role="alert" className="mt-1 pl-8 text-xs text-accent">
          {message}
        </p>
      )}
    </li>
  );
}

function AddContents({ titleId, hasPieces, onDone }: { titleId: string; hasPieces: boolean; onDone: () => void }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<PieceInput["kind"]>("story");
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const parsed = parseLines(text, kind);

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface p-3">
      <div>
        <label htmlFor="contents" className="text-sm font-medium">
          {hasPieces ? "Add more, one per line" : "Contents, one per line"}
        </label>
        <p className="text-xs text-muted">
          Type or paste them in order. To add an author, put it after a dash, like &ldquo;The Lottery — Shirley
          Jackson&rdquo;.
        </p>
        <textarea id="contents" value={text} onChange={(e) => setText(e.target.value)} rows={8} className={`mt-1 ${box}`} />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="These are">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-9 rounded-full border px-3 text-sm ${kind === k ? "border-accent bg-accent text-on-accent" : "border-border bg-background"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {parsed.length > 0 && (
        <p className="text-xs text-muted">
          {parsed.length} {KINDS.find((k) => k[0] === kind)![2]}
          {parsed.some((p) => p.authors.length) && `, ${parsed.filter((p) => p.authors.length).length} with an author`}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!parsed.length || busy}
          onClick={() => {
            setMessage(null);
            start(async () => {
              const r = await addPieces(titleId, parsed);
              if (!r.ok) return setMessage(r.error);
              setText("");
              onDone();
            });
          }}
          className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={onDone} className="min-h-10 rounded-full border border-border px-4 text-sm">
          Cancel
        </button>
      </div>
      {message && (
        <p role="alert" className="text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}
