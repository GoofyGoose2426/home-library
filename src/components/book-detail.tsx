/* eslint-disable @next/next/no-img-element -- hotlinked covers, see book-cover.tsx */
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { EditDetails } from "@/components/edit-details";
import { QuickEdit } from "@/components/quick-edit";
import { starLabel } from "@/lib/ratings";
import type { Book, BookCopy, FieldSource } from "@/lib/book";

const STATUS = { read: "Read", partly_read: "Partly read", unread: "Unread" } as const;

const BOOK_TYPE: Record<string, string> = {
  prose: "Prose",
  graphic_novel: "Graphic novel",
  manga: "Manga",
  comic_collection: "Comic collection",
  picture_book: "Picture book",
  poetry: "Poetry",
};

const FORMAT: Record<BookCopy["format"], string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market paperback",
  print_unknown: "Print (type not set)",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

const WHERE: Record<string, string> = { shelf: "Bookshelf", kobo: "Kobo", audible: "Audible", librofm: "Libro.fm", other: "Other" };
const ADDED_FROM: Record<string, string> = {
  shelf: "your shelf photos",
  kobo: "your Kobo screenshots",
  audible: "your Audible screenshots",
  librofm: "your Libro.fm list",
};

const ROLE: Record<string, string> = { author: "", writer: "Writer", artist: "Artist", editor: "Editor", translator: "Translator" };

const SPICE: Record<string, string> = {
  green_pepper: "Green pepper",
  yellow_pepper: "Yellow pepper",
  orange_pepper: "Orange pepper",
  red_pepper_1: "1 red pepper",
  red_pepper_2: "2 red peppers",
  red_pepper_3: "3 red peppers",
  red_pepper_4: "4 red peppers",
  red_pepper_5: "5 red peppers",
};
const FOCUS: Record<string, string> = { plot_led: "Plot-led", balanced: "Balanced", spice_led: "Spice-led" };
const VIBE: Record<string, string> = {
  cozy: "Cozy/feel-good",
  light: "Light/fun",
  dramatic: "Dramatic/heavy",
  intense: "Intense/dark",
};

function sourceLabel(s: FieldSource | undefined) {
  if (!s) return null;
  if (s.source === "alexandra") return "Set by you";
  const names: Record<string, string> = {
    import: "From your photos and screenshots",
    openlibrary: "Open Library",
    googlebooks: "Google Books",
    claude: "Suggested by Claude",
  };
  const name = names[s.source] ?? (() => {
    try {
      return new URL(s.source).hostname.replace(/^www\./, "");
    } catch {
      return s.source;
    }
  })();
  return s.confirmed ? `${name} · confirmed` : `${name} · not confirmed yet`;
}

function Source({ s }: { s: FieldSource | undefined }) {
  const label = sourceLabel(s);
  return label ? <span className="block text-[11px] text-muted">{label}</span> : null;
}

function largeCover(url: string) {
  // Open Library serves bigger versions of the same cover.
  return url.replace(/-M\.jpg$/, "-L.jpg");
}

function audioLength(minutes: number) {
  const h = Math.floor(minutes / 60);
  return h ? `${h} h ${minutes % 60} min` : `${minutes} min`;
}

function seriesNumber(n: number | null) {
  return n == null ? "" : `#${Number(n)}`;
}

export function BookDetail({ book }: { book: Book }) {
  const cover = book.copies.find((c) => c.coverUrl);
  const authors = book.credits.filter((c) => c.role !== "narrator");
  const story = [
    book.romanticSubplot != null && ["Romantic subplot", book.romanticSubplot ? "Yes" : "No"],
    book.spice && ["Spice", SPICE[book.spice]],
    book.storyFocus && ["Story focus", FOCUS[book.storyFocus]],
    book.vibeMain && ["Vibe", [VIBE[book.vibeMain], book.vibeSecond && VIBE[book.vibeSecond]].filter(Boolean).join(", then ")],
  ].filter(Boolean) as [string, string][];

  return (
    <article className="mt-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="mx-auto w-44 shrink-0 sm:mx-0 sm:w-52">
          {cover?.coverUrl ? (
            <div className="overflow-hidden rounded-2xl shadow-md">
              <img src={largeCover(cover.coverUrl)} alt={`Cover of ${book.title}`} className="aspect-[2/3] w-full bg-accent-soft object-cover" />
            </div>
          ) : (
            <BookCover title={book.title} authors={authors.map((a) => a.name)} url={null} className="!rounded-2xl !p-4 [&_p:first-child]:text-lg" />
          )}
          {cover?.coverUrl && (
            <p className="mt-2 text-center text-[11px] text-muted">
              {cover.sources.cover_url?.source === "alexandra"
                ? "Cover chosen by you"
                : cover.coverConfirmed
                  ? "Cover matched by ISBN"
                  : "Best-guess cover from Open Library · unconfirmed until an ISBN is added"}
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-semibold leading-tight">{book.title}</h1>
          {book.subtitle && <p className="mt-1 text-lg text-muted">{book.subtitle}</p>}
          {authors.length > 0 && (
            <p className="mt-2 text-lg">
              {authors.map((a, i) => (
                <span key={`${a.name}-${a.role}`}>
                  {i > 0 && ", "}
                  {a.name}
                  {ROLE[a.role] ? <span className="text-sm text-muted"> ({ROLE[a.role]})</span> : null}
                </span>
              ))}
            </p>
          )}
          <Source s={book.sources.authors} />

          {book.series && (
            <p className="mt-3">
              <Link
                href={`/?series=${encodeURIComponent(book.series.name)}&sort=series`}
                className="text-accent underline-offset-4 hover:underline"
              >
                {book.series.name} {seriesNumber(book.series.number)}
              </Link>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-accent-soft px-3 py-1 font-medium">{STATUS[book.readStatus]}</span>
            <span className="rounded-full border border-border px-3 py-1">{BOOK_TYPE[book.bookType] ?? book.bookType}</span>
            {(book.isReference || book.bookType === "picture_book") && (
              <span className="rounded-full border border-border px-3 py-1">Left out of stats</span>
            )}
          </div>
          <Source s={book.sources.read_status} />

          {book.needsCheck && (
            <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
              <strong>Needs checking:</strong> {book.checkNote ?? "The title or author was uncertain in the photos."}
            </p>
          )}

          {book.rating != null && (
            <p className="mt-3 text-sm">
              <span className="text-accent">★</span> <strong>{book.rating}</strong> · {starLabel(book.rating)}
            </p>
          )}

          {book.description && <p className="mt-4 leading-relaxed">{book.description}</p>}

          <div className="mt-5">
            <EditDetails
              key={`${book.title}|${book.credits.map((c) => c.name).join(",")}|${book.series?.name ?? ""}`}
              seriesNames={book.seriesNames}
              peopleNames={book.peopleNames}
              book={{
                id: book.id,
                title: book.title,
                subtitle: book.subtitle,
                bookType: book.bookType,
                series: book.series?.name ?? null,
                seriesNumber: book.series?.number ?? null,
                needsCheck: book.needsCheck,
                credits: authors,
                audiobooks: book.copies
                  .filter((c) => c.format === "audiobook")
                  .map((c) => ({ id: c.id, label: `${WHERE[c.source] ?? "Other"} audiobook`, narrators: c.narrators })),
              }}
            />
          </div>
        </div>
      </div>

      <Section title={book.copies.length === 1 ? "Your copy" : `Your ${book.copies.length} copies`}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {book.copies.map((c) => (
            <li key={c.id}>
              <CopyCard copy={c} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Update">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <QuickEdit
            book={{
              id: book.id,
              title: book.title,
              readStatus: book.readStatus,
              rating: book.rating,
              isReference: book.isReference,
              pieces: book.pieces,
              pieceCount: book.pieces.length,
              copies: book.copies.map((c) => ({
                id: c.id,
                format: c.format,
                source: c.source,
                onLoanTo: c.onLoanTo,
                keepsakeNotes: c.keepsakeNotes,
              })),
            }}
          />
        </div>
      </Section>

      {book.series && book.series.books.length > 1 && (
        <Section title={`${book.series.name}: the volumes you own`}>
          <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {book.series.books.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/books/${s.id}`}
                  aria-current={s.id === book.id ? "page" : undefined}
                  className={`flex items-baseline gap-3 px-4 py-2.5 text-sm hover:bg-accent-soft ${s.id === book.id ? "font-semibold" : ""}`}
                >
                  <span className="w-10 shrink-0 text-muted">{seriesNumber(s.number) || "–"}</span>
                  <span className="min-w-0 flex-1">{s.title}</span>
                  <span className="shrink-0 text-xs text-muted">{s.readStatus === "read" ? "✓ Read" : "Unread"}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">Missing volumes show up once series details are filled in (Phase 2).</p>
        </Section>
      )}

      <Section title="Genre and story">
        {book.genres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {book.genres.map((g) => (
              <span key={`${g.kind}-${g.name}`} className="rounded-full border border-border px-3 py-1 text-sm">
                {g.name}
                <Source s={{ source: g.source, confirmed: g.confirmed }} />
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No genre yet.</p>
        )}
        {story.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {story.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          Coming in Phase 2, each with its source for you to check: subgenres, tropes, vibe, romantic subplot,
          spice, story focus, publisher, length, and author and character representation.
        </p>
      </Section>
    </article>
  );
}

function CopyCard({ copy: c }: { copy: BookCopy }) {
  const details = [
    c.edition && ["Edition", c.edition],
    c.editionType === "omnibus" && ["Edition type", "Omnibus / collected edition"],
    c.containsFrom != null && ["Contains", `Vols. ${Number(c.containsFrom)}–${Number(c.containsTo ?? c.containsFrom)}`],
    c.publisher && ["Publisher", c.publisher],
    c.isbn13 && ["ISBN", c.isbn13],
    !c.isbn13 && c.isbn10 && ["ISBN-10", c.isbn10],
    c.pages && ["Length", `${c.pages} pages`],
    c.audioMinutes && ["Length", audioLength(c.audioMinutes)],
    c.estWords && ["Words (est.)", c.estWords.toLocaleString()],
    c.narrators.length > 0 && ["Narrated by", c.narrators.join(", ")],
    c.bonusNotes && ["Bonus content", c.bonusNotes],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="h-full rounded-2xl border border-border bg-surface p-4">
      <p className="font-medium">
        {FORMAT[c.format]} <span className="text-muted">· {WHERE[c.source] ?? c.source}</span>
      </p>
      {c.onLoanTo && <p className="mt-1 text-sm text-accent">On loan to {c.onLoanTo}</p>}
      {c.keepsakeNotes && <p className="mt-1 text-sm">Keepsake: {c.keepsakeNotes}</p>}
      {details.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {details.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {ADDED_FROM[c.source] && <p className="mt-3 text-[11px] text-muted">Added from {ADDED_FROM[c.source]}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-serif text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
