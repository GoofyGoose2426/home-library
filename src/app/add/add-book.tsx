"use client";

/* eslint-disable @next/next/no-img-element -- hotlinked Open Library covers */
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { addBook, type NewBook, type NewCopy } from "@/app/edit-actions";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { copyLabel } from "@/lib/copy-labels";
import type { LibraryBook } from "@/lib/library";
import { findBooks } from "@/lib/lookup";

type OwnedBook = Pick<LibraryBook, "id" | "title" | "authors" | "copies" | "series" | "seriesNumber">;

type Result = {
  key: string;
  title: string;
  subtitle?: string;
  authors: string[];
  coverId?: number;
  year?: number;
  isbn13?: string;
  publisher?: string;
  pages?: number;
};

const FORMATS: [NewCopy["format"], string][] = [
  ["hardcover", "Hardcover"],
  ["trade_paperback", "Trade paperback"],
  ["mass_market", "Mass-market paperback"],
  ["print_unknown", "Print (not sure which)"],
  ["ebook", "Ebook"],
  ["audiobook", "Audiobook"],
];
const APPS: [NewCopy["source"], string][] = [
  ["kobo", "Kobo"],
  ["audible", "Audible"],
  ["librofm", "Libro.fm"],
  ["other", "Other"],
];
const BOOK_TYPES: [NewBook["bookType"], string][] = [
  ["prose", "Prose"],
  ["graphic_novel", "Graphic novel"],
  ["manga", "Manga"],
  ["comic_collection", "Comic collection"],
  ["picture_book", "Picture book"],
  ["poetry", "Poetry"],
];

const input = "mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base";

// ISBN-10 or -13 (with or without dashes) to ISBN-13, or null if it isn't one.
export function toIsbn13(raw: string): string | null {
  const s = raw.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (/^97[89]\d{10}$/.test(s)) return s;
  if (/^\d{9}[\dX]$/.test(s)) {
    const core = `978${s.slice(0, 9)}`;
    const sum = [...core].reduce((t, d, i) => t + Number(d) * (i % 2 ? 3 : 1), 0);
    return core + ((10 - (sum % 10)) % 10);
  }
  return null;
}

async function searchOpenLibrary(query: string): Promise<Result[]> {
  const isbn = toIsbn13(query);
  const params = new URLSearchParams({
    q: isbn ? `isbn:${isbn}` : query,
    fields: "key,title,subtitle,author_name,cover_i,first_publish_year,number_of_pages_median,publisher,isbn",
    limit: "10",
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error("Open Library didn't answer. Try again, or enter the book yourself.");
  const docs: {
    key: string;
    title: string;
    subtitle?: string;
    author_name?: string[];
    cover_i?: number;
    first_publish_year?: number;
    number_of_pages_median?: number;
    publisher?: string[];
  }[] = (await res.json()).docs ?? [];
  return docs.map((d) => ({
    key: d.key,
    title: d.title,
    subtitle: d.subtitle,
    authors: (d.author_name ?? []).slice(0, 4),
    coverId: d.cover_i,
    year: d.first_publish_year,
    // Only trust edition details when she searched by the ISBN on her copy.
    isbn13: isbn ?? undefined,
    publisher: isbn ? d.publisher?.[0] : undefined,
    pages: isbn ? d.number_of_pages_median : undefined,
  }));
}

function surname(name: string) {
  const w = name.toLowerCase().replace(/[^a-z\s-]/g, " ").trim().split(/\s+/);
  return w[w.length - 1] ?? "";
}

export function AddBook({
  library,
  copyOf,
  seriesNames,
  peopleNames,
}: {
  library: OwnedBook[];
  copyOf: Pick<OwnedBook, "id" | "title" | "authors" | "copies"> | null;
  seriesNames: string[];
  peopleNames: string[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<Result | null>(null);
  const [manual, setManual] = useState(false);
  const [saved, setSaved] = useState<{ titleId: string; title: string; asCopy: boolean } | null>(null);
  // Bumping this starts a fresh, empty form.
  const [round, setRound] = useState(0);

  function startOver() {
    setSaved(null);
    setPicked(null);
    setManual(false);
    setRound((r) => r + 1);
    window.scrollTo({ top: 0 });
  }

  if (saved) {
    return (
      <div className="mt-6 rounded-3xl border border-border bg-surface p-6 text-center">
        <p className="text-4xl" aria-hidden>
          📚
        </p>
        <h1 className="mt-2 font-serif text-2xl font-semibold">
          {saved.asCopy ? "Copy added" : "Added to your library"}
        </h1>
        <p className="mt-1 text-muted">{saved.title}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={startOver}
            className="min-h-12 rounded-2xl bg-accent px-5 font-medium text-on-accent"
          >
            {copyOf ? "Add another copy" : "Add another book"}
          </button>
          <button
            type="button"
            onClick={() => router.replace(copyOf ? `/books/${copyOf.id}` : "/")}
            className="min-h-12 rounded-2xl border border-border px-5 font-medium"
          >
            {copyOf ? "Back to the book" : "Finish"}
          </button>
          {!copyOf && (
            <button
              type="button"
              onClick={() => router.replace(`/books/${saved.titleId}`)}
              className="mt-1 text-sm text-accent underline-offset-4 hover:underline"
            >
              Open its page
            </button>
          )}
        </div>
      </div>
    );
  }

  const onSaved = (titleId: string, title: string, asCopy: boolean) => {
    setSaved({ titleId, title, asCopy });
    // Reload the library behind the page so the next book's duplicate check sees this one.
    router.refresh();
  };

  if (copyOf) {
    return (
      <>
        <h1 className="mt-3 font-serif text-3xl font-semibold">Add a copy</h1>
        <p className="mt-1 text-muted">
          of <strong className="text-foreground">{copyOf.title}</strong>
          {copyOf.authors.length > 0 && ` by ${copyOf.authors.join(", ")}`}. You have:{" "}
          {[...new Set(copyOf.copies.map(copyLabel))].join(", ")}.
        </p>
        <BookForm
          key={round}
          result={{ key: "", title: copyOf.title, authors: copyOf.authors }}
          copyOfId={copyOf.id}
          library={library}
          seriesNames={seriesNames}
          peopleNames={peopleNames}
          onSaved={onSaved}
        />
      </>
    );
  }

  return (
    <>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Add a book</h1>
      {picked || manual ? (
        <>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setManual(false);
            }}
            className="mt-2 text-sm text-accent underline-offset-4 hover:underline"
          >
            ← Search again
          </button>
          <BookForm
            key={round}
            result={picked ?? { key: "", title: "", authors: [] }}
            copyOfId={null}
            library={library}
            seriesNames={seriesNames}
            peopleNames={peopleNames}
            onSaved={onSaved}
          />
        </>
      ) : (
        <Search key={round} library={library} onPick={setPicked} onManual={() => setManual(true)} />
      )}
    </>
  );
}

function ownedMatch(library: OwnedBook[], title: string, authors: string[]) {
  if (!title.trim()) return null;
  const names = new Set(authors.map(surname));
  const hit = findBooks(library as LibraryBook[], title, 5).find(
    (m) => m.score >= 80 && (!names.size || m.book.authors.some((a) => names.has(surname(a)))),
  );
  return hit ? (hit.book as OwnedBook) : null;
}

function Search({
  library,
  onPick,
  onManual,
}: {
  library: OwnedBook[];
  onPick: (r: Result) => void;
  onManual: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [scanning, setScanning] = useState(false);

  const run = useCallback((q: string) => {
    setError(null);
    startBusy(async () => {
      try {
        setResults(await searchOpenLibrary(q.trim()));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search didn't work.");
      }
    });
  }, []);

  const scanned = useCallback(
    (isbn: string) => {
      setScanning(false);
      setQuery(isbn);
      run(isbn);
    },
    [run],
  );

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          setResults(null);
          setScanning(true);
        }}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-lg font-medium text-on-accent"
      >
        <span aria-hidden>▥</span> Scan the barcode
      </button>
      {scanning && <BarcodeScanner onIsbn={scanned} onClose={() => setScanning(false)} />}

      <p className="mt-5 text-sm font-medium">Or search by title, author or ISBN</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="mt-1 flex gap-2"
      >
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Fourth Wing, or Yarros"
          className="min-w-0 flex-1 rounded-2xl border-2 border-border bg-surface px-4 py-3 text-lg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 2}
          className="min-h-12 rounded-2xl bg-accent px-4 font-medium text-on-accent disabled:opacity-50"
        >
          Search
        </button>
      </form>
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {busy
          ? "Searching Open Library… this can take a few seconds."
          : "Scanning or typing the ISBN finds your exact edition. Searches Open Library."}
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          {error}
        </p>
      )}

      {results && (
        <ul className="mt-4 space-y-2">
          {results.map((r) => {
            const owned = ownedMatch(library, r.title, r.authors);
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full gap-3 rounded-2xl border border-border bg-surface p-3 text-left hover:bg-accent-soft"
                >
                  {r.coverId ? (
                    <img
                      src={`https://covers.openlibrary.org/b/id/${r.coverId}-S.jpg`}
                      alt=""
                      className="aspect-[2/3] w-12 shrink-0 rounded-md bg-accent-soft object-cover"
                    />
                  ) : (
                    <span className="aspect-[2/3] w-12 shrink-0 rounded-md bg-accent-soft" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium leading-snug">{r.title}</span>
                    <span className="block text-sm text-muted">
                      {r.authors.join(", ")}
                      {r.year ? ` · ${r.year}` : ""}
                    </span>
                    {owned && (
                      <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium">
                        {owned.copies.length
                          ? `In your library: ${[...new Set(owned.copies.map(copyLabel))].join(", ")}`
                          : "On your Gone list"}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li className="text-sm text-muted">Nothing found on Open Library.</li>}
        </ul>
      )}
      <button type="button" onClick={onManual} className="mt-4 text-sm text-accent underline-offset-4 hover:underline">
        Can&apos;t find it? Enter it yourself
      </button>
    </div>
  );
}

function BookForm({
  result,
  copyOfId,
  library,
  seriesNames,
  peopleNames,
  onSaved,
}: {
  result: Result;
  copyOfId: string | null;
  library: OwnedBook[];
  seriesNames: string[];
  peopleNames: string[];
  onSaved: (titleId: string, title: string, asCopy: boolean) => void;
}) {
  const ids = useId();
  const [title, setTitle] = useState(result.title);
  const [subtitle, setSubtitle] = useState(result.subtitle ?? "");
  const [authors, setAuthors] = useState(result.authors.join(", "));
  const [series, setSeries] = useState("");
  const [seriesNumber, setSeriesNumber] = useState("");
  const [bookType, setBookType] = useState<NewBook["bookType"]>("prose");
  const [readStatus, setReadStatus] = useState<NewBook["readStatus"]>("unread");
  const [format, setFormat] = useState<NewCopy["format"]>("trade_paperback");
  const [app, setApp] = useState<NewCopy["source"]>("kobo");
  const [isbn, setIsbn] = useState(result.isbn13 ?? "");
  const [publisher, setPublisher] = useState(result.publisher ?? "");
  const [pages, setPages] = useState(result.pages ? String(result.pages) : "");
  const [useCover, setUseCover] = useState(!!result.coverId);
  const [loan, setLoan] = useState("");
  const [narrators, setNarrators] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const digital = format === "ebook" || format === "audiobook";
  const authorList = useMemo(() => authors.split(",").map((a) => a.trim()).filter(Boolean), [authors]);
  const owned = copyOfId ? null : ownedMatch(library, title, authorList);
  const [asCopy, setAsCopy] = useState(true);
  const addingCopyTo = copyOfId ?? (owned && asCopy ? owned.id : null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const isbn13 = isbn.trim() ? toIsbn13(isbn) : "";
    if (isbn13 === null) {
      setError("That ISBN doesn't look right. It should be 10 or 13 digits.");
      return;
    }
    const pageCount = pages.trim() ? Number(pages) : null;
    if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount <= 0)) {
      setError("Pages should be a whole number.");
      return;
    }
    const number = seriesNumber.trim() ? Number(seriesNumber.replace(",", ".")) : null;
    if (number !== null && !Number.isFinite(number)) {
      setError("The series number should be a number, like 3 or 1.5.");
      return;
    }
    startSaving(async () => {
      const res = await addBook(
        addingCopyTo,
        addingCopyTo
          ? null
          : {
              title,
              subtitle,
              bookType,
              readStatus,
              series,
              seriesNumber: number,
              credits: authorList.map((name) => ({ name, role: "author" as const })),
            },
        {
          format,
          source: digital ? app : "shelf",
          isbn13: isbn13 ?? "",
          publisher,
          pages: pageCount,
          coverUrl: useCover && result.coverId ? `https://covers.openlibrary.org/b/id/${result.coverId}-M.jpg` : "",
          onLoanTo: digital ? "" : loan,
          narrators: format === "audiobook" ? narrators.split(",").map((n) => n.trim()).filter(Boolean) : [],
        },
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved(res.titleId, addingCopyTo ? (owned?.title ?? result.title) : title.trim(), !!addingCopyTo);
    });
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          {error}
        </p>
      )}

      {owned && (
        <div className="rounded-2xl bg-accent-soft p-4 text-sm">
          <p>
            {owned.copies.length ? (
              <>
                <strong>You already have {owned.title}</strong> ({[...new Set(owned.copies.map(copyLabel))].join(", ")}).
              </>
            ) : (
              <>
                <strong>You&apos;ve had {owned.title} before.</strong> It&apos;s on your Gone list; adding it as a
                copy brings it back with its rating and details.
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Toggle on={asCopy} onClick={() => setAsCopy(true)}>
              Add as another copy
            </Toggle>
            <Toggle on={!asCopy} onClick={() => setAsCopy(false)}>
              It&apos;s a different book
            </Toggle>
          </div>
        </div>
      )}

      {!addingCopyTo && (
        <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-medium">The book</legend>
          <label className="block text-sm">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} className={input} />
          </label>
          <label className="block text-sm">
            Subtitle <span className="text-muted">(optional)</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={300} className={input} />
          </label>
          <label className="block text-sm">
            Author(s), separated by commas
            <input value={authors} onChange={(e) => setAuthors(e.target.value)} list={`${ids}-people`} maxLength={1000} className={input} />
            <datalist id={`${ids}-people`}>
              {peopleNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <label className="block text-sm">
              Series <span className="text-muted">(optional)</span>
              <input value={series} onChange={(e) => setSeries(e.target.value)} list={`${ids}-series`} maxLength={200} className={input} />
              <datalist id={`${ids}-series`}>
                {seriesNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm">
              Number
              <input
                value={seriesNumber}
                onChange={(e) => setSeriesNumber(e.target.value)}
                inputMode="decimal"
                disabled={!series.trim()}
                className={`${input} disabled:opacity-50`}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Book type
              <select value={bookType} onChange={(e) => setBookType(e.target.value as NewBook["bookType"])} className={input}>
                {BOOK_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Status
              <select value={readStatus} onChange={(e) => setReadStatus(e.target.value as NewBook["readStatus"])} className={input}>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium">{addingCopyTo ? "The new copy" : "Your copy"}</legend>
        {result.coverId && (
          <label className="flex items-center gap-3 text-sm">
          <img
            src={`https://covers.openlibrary.org/b/id/${result.coverId}-M.jpg`}
            alt=""
            className="aspect-[2/3] w-16 rounded-md bg-accent-soft object-cover"
          />
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={useCover} onChange={(e) => setUseCover(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Use this cover
          </span>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as NewCopy["format"])} className={input}>
              {FORMATS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {digital ? (
            <label className="block text-sm">
              In which app
              <select value={app} onChange={(e) => setApp(e.target.value as NewCopy["source"])} className={input}>
                {APPS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="self-end pb-2 text-sm text-muted">Lives on your Bookshelf</p>
          )}
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <label className="block text-sm">
            ISBN <span className="text-muted">(optional)</span>
            <input value={isbn} onChange={(e) => setIsbn(e.target.value)} inputMode="numeric" maxLength={20} className={input} />
          </label>
          <label className="block text-sm">
            Pages
            <input value={pages} onChange={(e) => setPages(e.target.value)} inputMode="numeric" className={input} />
          </label>
        </div>
        <label className="block text-sm">
          Publisher <span className="text-muted">(optional)</span>
          <input value={publisher} onChange={(e) => setPublisher(e.target.value)} maxLength={200} className={input} />
        </label>
        {format === "audiobook" && (
          <label className="block text-sm">
            Narrators <span className="text-muted">(separate with commas)</span>
            <input value={narrators} onChange={(e) => setNarrators(e.target.value)} maxLength={1000} className={input} />
          </label>
        )}
        {!digital && (
          <label className="block text-sm">
            On loan to <span className="text-muted">(if it&apos;s lent out right now)</span>
            <input value={loan} onChange={(e) => setLoan(e.target.value)} maxLength={80} placeholder="Name" className={input} />
          </label>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={saving || (!addingCopyTo && !title.trim())}
        className="min-h-12 w-full rounded-2xl bg-accent px-5 font-medium text-on-accent disabled:opacity-50"
      >
        {saving ? "Saving…" : addingCopyTo ? "Add this copy" : "Add to my library"}
      </button>
    </form>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm ${on ? "border-accent bg-accent text-on-accent" : "border-border bg-background"}`}
    >
      {children}
    </button>
  );
}
