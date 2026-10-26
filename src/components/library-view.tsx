"use client";

import { useSyncExternalStore } from "react";
import { BookCover } from "@/components/book-cover";
import type { CopyFormat, LibraryBook } from "@/lib/library";

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

function formatList(formats: CopyFormat[]) {
  return formats.map((f) => FORMAT_LABEL[f]).join(" + ");
}

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

export function LibraryView({ books }: { books: LibraryBook[] }) {
  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as View);

  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {books.length.toLocaleString()} books ·{" "}
          {books.filter((b) => b.readStatus === "read").length.toLocaleString()} read
        </p>
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
      {view === "grid" ? <Grid books={books} /> : <Table books={books} />}
    </>
  );
}

function Grid({ books }: { books: LibraryBook[] }) {
  return (
    <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
      {books.map((b) => (
        <li key={b.id} className="[content-visibility:auto] [contain-intrinsic-size:auto_260px]">
          <BookCover title={b.title} authors={b.authors} url={b.coverUrl} />
          <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{b.title}</p>
          {b.authors.length > 0 && <p className="line-clamp-1 text-[11px] text-muted">{b.authors.join(", ")}</p>}
          <p className="line-clamp-1 text-[11px] text-muted">
            {b.readStatus !== "unread" && (
              <span className="font-medium text-foreground">
                {b.readStatus === "read" ? "✓ Read" : "Partly read"} ·{" "}
              </span>
            )}
            {formatList(b.formats)}
            {b.onLoanTo.length > 0 && ` · On loan to ${b.onLoanTo.join(", ")}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Table({ books }: { books: LibraryBook[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Title</th>
            <th scope="col" className="hidden w-[18%] px-3 py-2 font-medium md:table-cell">Author</th>
            <th scope="col" className="w-24 px-3 py-2 font-medium sm:w-28">Status</th>
            <th scope="col" className="hidden w-[16%] px-3 py-2 font-medium sm:table-cell">Format</th>
            <th scope="col" className="hidden w-[18%] px-3 py-2 font-medium lg:table-cell">Shelf</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 [content-visibility:auto] [contain-intrinsic-size:auto_56px]">
              <td className="px-3 py-2 align-top">
                <div className="flex gap-3">
                  <BookCover title={b.title} authors={[]} url={b.coverUrl} className="w-9 shrink-0 !rounded-md !p-0.5 [&_p]:hidden" />
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{b.title}</p>
                    {seriesLabel(b) && <p className="text-xs text-muted">{seriesLabel(b)}</p>}
                    {/* On narrow screens the hidden columns fold in here. */}
                    <p className="text-xs text-muted md:hidden">{b.authors.join(", ")}</p>
                    <p className="text-xs text-muted sm:hidden">{formatList(b.formats)}</p>
                    {b.onLoanTo.length > 0 && (
                      <p className="text-xs text-accent">On loan to {b.onLoanTo.join(", ")}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="hidden px-3 py-2 align-top md:table-cell">{b.authors.join(", ")}</td>
              <td className="px-3 py-2 align-top">
                <span className={b.readStatus === "unread" ? "text-muted" : ""}>{STATUS_LABEL[b.readStatus]}</span>
              </td>
              <td className="hidden px-3 py-2 align-top sm:table-cell">{formatList(b.formats)}</td>
              <td className="hidden px-3 py-2 align-top text-muted lg:table-cell">{b.locations.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
