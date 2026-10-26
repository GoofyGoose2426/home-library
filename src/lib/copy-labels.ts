import type { LibraryBook } from "./library";

const APP_LABEL: Record<string, string> = { kobo: "Kobo", audible: "Audible", librofm: "Libro.fm" };
const PRINT_TYPE: Partial<Record<string, string>> = {
  hardcover: "hardcover",
  trade_paperback: "trade paperback",
  mass_market: "mass-market",
};

// Where each copy lives: print copies are "Bookshelf", digital ones name the app.
export function copyLabel(c: LibraryBook["copies"][number]) {
  if (c.format === "ebook" || c.format === "audiobook") {
    return `${APP_LABEL[c.source] ?? "Other"} ${c.format}`;
  }
  return PRINT_TYPE[c.format] ? `Bookshelf (${PRINT_TYPE[c.format]})` : "Bookshelf";
}

export function copyList(book: LibraryBook) {
  return [...new Set(book.copies.map(copyLabel))].join(" + ");
}
