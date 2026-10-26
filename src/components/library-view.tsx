"use client";

import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookCover } from "@/components/book-cover";
import { LibraryFilterBar } from "@/components/library-filter-bar";
import { QuickEdit, type EditableBook } from "@/components/quick-edit";
import { setPrintType } from "@/app/edit-actions";
import type { CopyFormat, LibraryBook } from "@/lib/library";
import { copyList } from "@/lib/copy-labels";
import { starLabel, starText } from "@/lib/ratings";
import {
  applyFilters,
  filterOptions,
  readFilters,
  reviewReasons,
  writeFilters,
  type Filters,
} from "@/lib/library-filters";

type View = "grid" | "table";
const VIEW_KEY = "library-view";

export const FORMAT_LABEL: Record<CopyFormat, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market",
  print_unknown: "Print",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

const STATUS_LABEL: Record<LibraryBook["readStatus"], string> = {
  read: "Read",
  partly_read: "Partly read",
  unread: "Unread",
};


function seriesLabel(book: LibraryBook) {
  if (!book.series) return null;
  return book.seriesNumber != null ? `${book.series} #${Number(book.seriesNumber)}` : book.series;
}

// The last view is remembered on this device only.
// Falls back to memory when the browser blocks storage.
const viewListeners = new Set<() => void>();
let memoryView: View = "grid";
function readView(): View {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return saved === "table" || saved === "grid" ? saved : memoryView;
  } catch {
    return memoryView;
  }
}
function chooseView(v: View) {
  memoryView = v;
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {}
  viewListeners.forEach((l) => l());
}
function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  return () => viewListeners.delete(listener);
}

const FORMAT_ORDER: CopyFormat[] = ["hardcover", "trade_paperback", "mass_market", "print_unknown", "ebook", "audiobook"];

function toEditable(b: LibraryBook): EditableBook {
  return {
    id: b.id,
    title: b.title,
    readStatus: b.readStatus,
    rating: b.rating,
    writingQuality: b.writingQuality,
    recommendation: b.recommendation,
    isReference: b.isReference,
    pieceCount: b.pieceCount,
    copies: b.copies,
  };
}

// Applies an edit made here on top of the loaded book, so the list updates
// straight away without reloading the whole library.
function withEdit(b: LibraryBook, e: EditableBook | undefined): LibraryBook {
  if (!e) return b;
  const copies = [...e.copies].sort((x, y) => FORMAT_ORDER.indexOf(x.format) - FORMAT_ORDER.indexOf(y.format));
  return {
    ...b,
    readStatus: e.readStatus,
    rating: e.rating,
    writingQuality: e.writingQuality,
    recommendation: e.recommendation,
    isReference: e.isReference,
    copies,
    audioPerformance: Math.max(0, ...copies.map((c) => c.audioPerformance ?? 0)) || null,
    formats: [...new Set(copies.map((c) => c.format))],
    onLoanTo: copies.flatMap((c) => (c.onLoanTo ? [c.onLoanTo] : [])),
    hasKeepsake: copies.some((c) => !!c.keepsakeNotes),
  };
}

const PRINT_TYPES: [CopyFormat, string][] = [
  ["hardcover", "Hardcover"],
  ["trade_paperback", "Trade paperback"],
  ["mass_market", "Mass-market"],
];

export function LibraryView({ books: loaded }: { books: LibraryBook[] }) {
  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as View);
  const [edits, setEdits] = useState<Record<string, EditableBook>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const books = useMemo(() => loaded.map((b) => withEdit(b, edits[b.id])), [loaded, edits]);

  // Filters live in the address bar, so Back and reloads keep them.
  const params = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);
  const deferred = useDeferredValue(filters);
  const shown = useMemo(() => applyFilters(books, deferred), [books, deferred]);
  const options = useMemo(() => filterOptions(books), [books]);

  // Each change builds on the address bar as it is now, so quick taps
  // never overwrite each other.
  function updateFilters(change: (current: Filters) => Filters) {
    const current = readFilters(new URLSearchParams(window.location.search));
    window.history.replaceState(null, "", `${window.location.pathname}${writeFilters(change(current))}`);
  }

  const editingBook = editing ? books.find((b) => b.id === editing) : undefined;
  const toReview = useMemo(() => books.filter((b) => reviewReasons(b).length > 0).length, [books]);
  const recordEdit = (e: EditableBook) => setEdits((all) => ({ ...all, [e.id]: e }));

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function applyPrintType(format: CopyFormat) {
    const chosen = books.filter((b) => selected.has(b.id));
    const copyIds = chosen.flatMap((b) => b.copies.filter((c) => c.source === "shelf").map((c) => c.id));
    if (!copyIds.length) {
      setBatchMessage("None of those books has a Bookshelf copy.");
      return;
    }
    const before = edits;
    for (const b of chosen) {
      recordEdit({
        ...toEditable(b),
        copies: b.copies.map((c) => (c.source === "shelf" ? { ...c, format } : c)),
      });
    }
    stopSelecting();
    try {
      const n = await setPrintType(copyIds, format as "hardcover" | "trade_paperback" | "mass_market");
      setBatchMessage(`Set ${n} ${n === 1 ? "copy" : "copies"} to ${PRINT_TYPES.find((p) => p[0] === format)?.[1]}.`);
    } catch {
      setEdits(before);
      setBatchMessage("Couldn't save the print type. Check your connection and try again.");
    }
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <p className="text-muted">
            {books.filter((b) => b.readStatus === "read").length.toLocaleString()} of{" "}
            {books.length.toLocaleString()} read
          </p>
          {toReview > 0 && (
            <button
              type="button"
              onClick={() =>
                updateFilters((f) => ({ ...f, review: f.review.includes("any") ? f.review.filter((r) => r !== "any") : [...f.review, "any"] }))
              }
              aria-pressed={filters.review.includes("any")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filters.review.includes("any") ? "bg-accent text-on-accent" : "bg-accent-soft"}`}
            >
              ⚑ {toReview.toLocaleString()} need review
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (selecting ? stopSelecting() : (setSelecting(true), setBatchMessage(null)))}
            aria-pressed={selecting}
            className={`min-h-9 rounded-full border px-4 text-sm ${selecting ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}
          >
            {selecting ? "Cancel" : "Select"}
          </button>
          <div className="flex rounded-full border border-border bg-surface p-1" role="tablist" aria-label="View">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => chooseView(v)}
                className={`min-h-9 rounded-full px-4 text-sm ${view === v ? "bg-accent text-on-accent" : ""}`}
              >
                {v === "grid" ? "Covers" : "Table"}
              </button>
            ))}
          </div>
        </div>
      </div>
      {batchMessage && (
        <p role="status" className="mt-3 rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          {batchMessage}
        </p>
      )}
      {selecting && (
        <p className="mt-3 text-sm text-muted">
          Tap books to select them, then choose a print type below. Tip: filter by Format → &ldquo;Print (type not
          set)&rdquo; first.
        </p>
      )}
      <LibraryFilterBar
        filters={filters}
        options={options}
        shown={shown.length}
        total={books.length}
        onChange={updateFilters}
      />
      {shown.length === 0 ? (
        <p className="mt-10 text-center text-muted">No books match. Try removing a filter.</p>
      ) : view === "grid" ? (
        <Grid books={shown} selecting={selecting} selected={selected} onSelect={toggleSelected} onEdit={setEditing} />
      ) : (
        <Table books={shown} selecting={selecting} selected={selected} onSelect={toggleSelected} onEdit={setEditing} />
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>
                <strong>{selected.size}</strong> selected
              </span>
              <button
                type="button"
                onClick={() => setSelected(new Set(shown.map((b) => b.id)))}
                className="text-accent underline-offset-4 hover:underline"
              >
                Select all {shown.length}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRINT_TYPES.map(([format, label]) => (
                <button
                  key={format}
                  type="button"
                  disabled={!selected.size}
                  onClick={() => applyPrintType(format)}
                  className="min-h-11 flex-1 rounded-xl bg-accent px-3 text-sm font-medium text-on-accent disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingBook && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditing(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Quick edit: ${editingBook.title}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-xl sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif text-xl font-semibold leading-tight">{editingBook.title}</p>
                <Link href={`/books/${editingBook.id}`} className="text-sm text-accent underline-offset-4 hover:underline">
                  Open book page
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-11 rounded-full border border-border px-4 text-sm"
              >
                Done
              </button>
            </div>
            <QuickEdit key={editingBook.id} book={toEditable(editingBook)} onChange={recordEdit} />
          </div>
        </div>
      )}
    </>
  );
}

type ItemProps = {
  books: LibraryBook[];
  selecting: boolean;
  selected: Set<string>;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
};

function EditButton({ book, onEdit }: { book: LibraryBook; onEdit: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(book.id)}
      aria-label={`Quick edit ${book.title}`}
      className="relative z-10 min-h-9 min-w-9 rounded-full bg-surface/90 px-2 text-base leading-none shadow-sm"
    >
      ✎
    </button>
  );
}

function Grid({ books, selecting, selected, onSelect, onEdit }: ItemProps) {
  return (
    <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 pb-28 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
      {books.map((b) => {
        const cover = <BookCover title={b.title} authors={b.authors} url={b.coverUrl} />;
        const text = (
          <>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{b.title}</p>
            {b.authors.length > 0 && <p className="line-clamp-1 text-[11px] text-muted">{b.authors.join(", ")}</p>}
            <p className="line-clamp-1 text-[11px] text-muted">
              {b.readStatus !== "unread" && (
                <span className="font-medium text-foreground">
                  {b.readStatus === "read" ? "✓ Read" : "Partly read"} ·{" "}
                </span>
              )}
              {b.rating != null && <span className="text-foreground">★ {starText(b.rating)} {starLabel(b.rating)} · </span>}
              {copyList(b)}
              {b.onLoanTo.length > 0 && ` · On loan to ${b.onLoanTo.join(", ")}`}
            </p>
            <ReviewNote book={b} compact />
          </>
        );
        const isSelected = selected.has(b.id);
        return (
          <li key={b.id} className="relative [content-visibility:auto] [contain-intrinsic-size:auto_260px]">
            {selecting ? (
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(b.id)}
                className={`block w-full rounded-xl text-left ${isSelected ? "outline-3 outline-offset-2 outline-accent" : "opacity-80"}`}
              >
                {cover}
                {text}
                {isSelected && (
                  <span className="absolute left-1 top-1 rounded-full bg-accent px-2 py-0.5 text-xs text-on-accent">✓</span>
                )}
              </button>
            ) : (
              <>
                <div className="relative">
                  <Link href={`/books/${b.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-accent">
                    {cover}
                  </Link>
                  <div className="absolute bottom-1 right-1">
                    <EditButton book={b} onEdit={onEdit} />
                  </div>
                </div>
                <Link href={`/books/${b.id}`} tabIndex={-1} className="block">
                  {text}
                </Link>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Table({ books, selecting, selected, onSelect, onEdit }: ItemProps) {
  return (
    <div className="mt-5 mb-28 overflow-hidden rounded-2xl border border-border bg-surface">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Title</th>
            <th scope="col" className="hidden w-[18%] px-3 py-2 font-medium md:table-cell">Author</th>
            <th scope="col" className="w-24 px-3 py-2 font-medium sm:w-28">Status</th>
            <th scope="col" className="hidden w-[24%] px-3 py-2 font-medium sm:table-cell">Copies</th>
            <th scope="col" className="w-12 px-1 py-2"><span className="sr-only">Edit</span></th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => {
            const isSelected = selected.has(b.id);
            return (
              <tr
                key={b.id}
                className={`relative border-b border-border last:border-0 [content-visibility:auto] [contain-intrinsic-size:auto_56px] ${isSelected ? "bg-accent-soft" : ""}`}
              >
                <td className="px-3 py-2 align-top">
                  <div className="flex gap-3">
                    <BookCover title={b.title} authors={[]} url={b.coverUrl} className="w-9 shrink-0 !rounded-md !p-0.5 [&_p]:hidden" />
                    <div className="min-w-0">
                      {selecting ? (
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onSelect(b.id)}
                          className="text-left font-medium leading-snug after:absolute after:inset-0"
                        >
                          {isSelected ? "✓ " : ""}
                          {b.title}
                        </button>
                      ) : (
                        <Link href={`/books/${b.id}`} className="font-medium leading-snug underline-offset-4 hover:underline after:absolute after:inset-0">
                          {b.title}
                        </Link>
                      )}
                      {seriesLabel(b) && <p className="text-xs text-muted">{seriesLabel(b)}</p>}
                      {/* On narrow screens the hidden columns fold in here. */}
                      <p className="text-xs text-muted md:hidden">{b.authors.join(", ")}</p>
                      <p className="text-xs text-muted sm:hidden">{copyList(b)}</p>
                      <ReviewNote book={b} />
                      {b.onLoanTo.length > 0 && (
                        <p className="text-xs text-accent">On loan to {b.onLoanTo.join(", ")}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden px-3 py-2 align-top md:table-cell">{b.authors.join(", ")}</td>
                <td className="px-3 py-2 align-top">
                  <span className={b.readStatus === "unread" ? "text-muted" : ""}>{STATUS_LABEL[b.readStatus]}</span>
                  {b.rating != null && (
                    <span className="block text-xs">
                      ★ {starText(b.rating)} · {starLabel(b.rating)}
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 align-top sm:table-cell">{copyList(b)}</td>
                <td className="px-1 py-1 align-top">{!selecting && <EditButton book={b} onEdit={onEdit} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const REVIEW_SHORT = { cover: "no cover", author: "no author", guess: "guessed title" } as const;

// In the grid there's only room for the flag; the table lists the reasons.
function ReviewNote({ book, compact = false }: { book: LibraryBook; compact?: boolean }) {
  const reasons = reviewReasons(book);
  if (!reasons.length) return null;
  return (
    <p className={`${compact ? "line-clamp-1" : ""} text-[11px] font-medium text-accent`} title={reasons.map((r) => REVIEW_SHORT[r]).join(", ")}>
      ⚑ Needs review{compact ? "" : `: ${reasons.map((r) => REVIEW_SHORT[r]).join(", ")}`}
    </p>
  );
}
