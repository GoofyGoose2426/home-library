/* eslint-disable @next/next/no-img-element -- hotlinked covers, see book-cover.tsx */
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { CoverPicker } from "@/components/cover-picker";
import { ClassificationEditor } from "@/components/classification-editor";
import { EditDetails } from "@/components/edit-details";
import { MergeEntry } from "@/components/merge-entry";
import { QuickEdit } from "@/components/quick-edit";
import { RemoveCopy, UndoGone } from "@/components/remove-copy";
import { GONE_LABEL } from "@/lib/gone";
import { AUDIO, RECOMMEND, STARS, WRITING, find, starText } from "@/lib/ratings";
import type { Book, BookCopy, FieldSource } from "@/lib/book";
import {
  AUDIENCE,
  KIND_LABEL,
  SPICE,
  STORY_FOCUS,
  VIBE,
  labelOf,
  type Spice,
  type StoryFocus,
  type TagKind,
  type Vibe,
} from "@/lib/classification";

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
  const cover = [...book.copies, ...book.goneCopies].find((c) => c.coverKind === "photo" && c.coverUrl) ?? [...book.copies, ...book.goneCopies].find((c) => c.coverUrl);
  const authors = book.credits.filter((c) => c.role !== "narrator");

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
              {cover.coverKind === "photo"
                ? "Your photo"
                : cover.sources.cover_url?.source === "alexandra"
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

          {book.copies.length === 0 && (
            <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
              <strong>On your Gone list.</strong> You don&apos;t own a copy now, so this book is left out of your
              library and stats. Undo below, or add a copy, to bring it back.
            </p>
          )}

          {book.needsCheck && (
            <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
              <strong>Needs checking:</strong> {book.checkNote ?? "The title or author was uncertain in the photos."}
            </p>
          )}

          <Ratings book={book} />

          {(book.firstPublished || book.typicalPages) && (
            <p className="mt-3 text-sm text-muted">
              {[book.firstPublished && `First published ${book.firstPublished}`, book.typicalPages && `Typically ${book.typicalPages} pages`]
                .filter(Boolean)
                .join(" · ")}
              <Source s={book.sources.first_published ?? book.sources.typical_pages} />
            </p>
          )}

          {book.description && (
            <div className="mt-4">
              <p className="whitespace-pre-line leading-relaxed">{book.description}</p>
              <Source s={book.sources.description} />
            </div>
          )}

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

      <Section
        title={book.copies.length === 1 ? "Your copy" : book.copies.length ? `Your ${book.copies.length} copies` : "Your copies"}
        action={
          <Link href={`/add?to=${book.id}`} className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-accent-soft">
            + Add a copy
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {book.copies.map((c) => (
            <li key={c.id}>
              <CopyCard copy={c} title={book.title} author={authors[0]?.name ?? ""} isLastCopy={book.copies.length === 1} />
            </li>
          ))}
        </ul>
        {book.copies.length === 0 && <p className="text-sm text-muted">You don&apos;t own a copy right now.</p>}
        <div className="mt-3">
          <MergeEntry titleId={book.id} title={book.title} />
        </div>
      </Section>

      {book.goneCopies.length > 0 && (
        <Section title="Gone">
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {book.goneCopies.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  {FORMAT[c.format]} <span className="text-muted">· {WHERE[c.source] ?? c.source}</span>
                  <span className="block text-xs text-muted">
                    {GONE_LABEL[c.goneReason!]} · {new Date(c.goneAt!).toLocaleDateString("en-CA", { dateStyle: "medium" })}
                  </span>
                </span>
                <UndoGone copyId={c.id} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Update">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <QuickEdit
            book={{
              id: book.id,
              title: book.title,
              readStatus: book.readStatus,
              rating: book.rating,
              writingQuality: book.writingQuality,
              recommendation: book.recommendation,
              isReference: book.isReference,
              pieces: book.pieces,
              pieceCount: book.pieces.length,
              copies: book.copies.map((c) => ({
                id: c.id,
                format: c.format,
                source: c.source,
                onLoanTo: c.onLoanTo,
                keepsakeNotes: c.keepsakeNotes,
                audioPerformance: c.audioPerformance,
                audioNote: c.audioNote,
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

      <Section title="Classification">
        <Classification book={book} />
        <div className="mt-4">
          <ClassificationEditor
            key={book.tags.map((t) => t.id).join(",") + book.audience + book.spice + book.storyFocus + book.vibeMain + book.vibeSecond + book.romanticSubplot}
            titleId={book.id}
            bookType={book.bookType}
            lists={book.lists}
            initial={{
              tagIds: book.tags.filter((t) => t.kind !== "rough_genre").map((t) => t.id),
              audience: book.audience,
              romanticSubplot: book.romanticSubplot,
              spice: book.spice as Spice | null,
              storyFocus: book.storyFocus as StoryFocus | null,
              vibeMain: book.vibeMain as Vibe | null,
              vibeSecond: book.vibeSecond as Vibe | null,
            }}
          />
        </div>
        <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">
          Coming later in Phase 2, each with its source for you to check: suggestions for all of this, publisher and
          length, and author and character representation.
        </p>
      </Section>
    </article>
  );
}

// " (Open Library, not confirmed)" after a value that was filled in for her.
function from(s: FieldSource | undefined) {
  if (!s || s.source === "alexandra" || s.confirmed) return "";
  const name = { openlibrary: "Open Library", googlebooks: "Google Books", import: "your photos" }[s.source] ?? s.source;
  return ` (${name}, not confirmed)`;
}

function CopyCard({ copy: c, title, author, isLastCopy }: { copy: BookCopy; title: string; author: string; isLastCopy: boolean }) {
  const details = [
    c.edition && ["Edition", c.edition],
    c.editionType === "omnibus" && ["Edition type", "Omnibus / collected edition"],
    c.containsFrom != null && ["Contains", `Vols. ${Number(c.containsFrom)}–${Number(c.containsTo ?? c.containsFrom)}`],
    c.publisher && ["Publisher", c.publisher + from(c.sources.publisher)],
    c.isbn13 && ["ISBN", c.isbn13],
    !c.isbn13 && c.isbn10 && ["ISBN-10", c.isbn10],
    c.pages && ["Length", `${c.pages} pages${from(c.sources.pages)}`],
    c.audioMinutes && ["Length", audioLength(c.audioMinutes)],
    c.estWords && ["Words (est.)", `~${c.estWords.toLocaleString()}${from(c.sources.est_words)}`],
    c.narrators.length > 0 && ["Narrated by", c.narrators.join(", ")],
    c.audioPerformance && ["Narration", `${c.audioPerformance} · ${find(AUDIO, c.audioPerformance)?.label}`],
    c.audioNote && ["Narration note", c.audioNote],
    c.bonusNotes && ["Bonus content", c.bonusNotes],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="h-full rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        {c.coverUrl && (
          <img src={c.coverUrl} alt="" className="aspect-[2/3] w-12 shrink-0 rounded-md bg-accent-soft object-cover" />
        )}
        <p className="font-medium">
          {FORMAT[c.format]} <span className="text-muted">· {WHERE[c.source] ?? c.source}</span>
        </p>
      </div>
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
      <CoverPicker copyId={c.id} title={title} author={author} hasCover={!!c.coverUrl} isPhoto={c.coverKind === "photo"} />
      <RemoveCopy
        copyId={c.id}
        label={c.format === "ebook" || c.format === "audiobook" ? `${WHERE[c.source] ?? "other"} ${c.format}` : "bookshelf copy"}
        isLastCopy={isLastCopy}
      />
    </div>
  );
}

// Her ratings, each with its label and description.
function Ratings({ book }: { book: Book }) {
  const stars = find(STARS, book.rating);
  const writing = find(WRITING, book.writingQuality);
  const recommend = find(RECOMMEND, book.recommendation);
  if (!stars) return null;
  return (
    <dl className="mt-4 space-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      <div>
        <dt className="sr-only">Stars</dt>
        <dd>
          <span className="text-accent">★</span> <strong>{starText(stars.value)}</strong> · {stars.label}
          <span className="block text-xs text-muted">{stars.description}</span>
        </dd>
      </div>
      {writing && (
        <div>
          <dt className="inline text-muted">Writing: </dt>
          <dd className="inline">
            {writing.value} · {writing.label}
            <span className="block text-xs text-muted">{writing.description}</span>
          </dd>
        </div>
      )}
      {recommend && (
        <div>
          <dt className="inline text-muted">Recommend: </dt>
          <dd className="inline">
            {recommend.label}
            <span className="block text-xs text-muted">{recommend.description}</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

const SHOWN_KINDS: TagKind[] = [
  "genre", "subgenre", "supernatural_being", "shifter_type", "queer_romance_type", "retelling_type",
  "trope", "subject", "reason", "gn_style", "manga_demographic", "franchise",
];

// What the book is, as she's set it (or as it came from the photos, marked).
function Classification({ book }: { book: Book }) {
  const rows: [string, React.ReactNode][] = [];
  const audience = labelOf(AUDIENCE, book.audience);
  if (audience) rows.push(["Audience", audience]);
  for (const k of SHOWN_KINDS) {
    const tags = book.tags.filter((t) => t.kind === k);
    if (!tags.length) continue;
    rows.push([
      KIND_LABEL[k],
      <span key={k} className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t.id}
            title={sourceLabel(t) ?? undefined}
            className={`rounded-full px-2.5 py-0.5 ${t.confirmed ? "bg-accent-soft" : "border border-dashed border-border"}`}
          >
            {t.name}
          </span>
        ))}
      </span>,
    ]);
  }
  if (book.vibeMain) rows.push(["Vibe", [labelOf(VIBE, book.vibeMain as Vibe), labelOf(VIBE, book.vibeSecond as Vibe)].filter(Boolean).join(", then ")]);
  if (book.romanticSubplot != null) rows.push(["Romantic subplot", book.romanticSubplot ? "Yes" : "No"]);
  if (book.spice) rows.push(["Spice", labelOf(SPICE, book.spice as Spice)]);
  if (book.storyFocus) rows.push(["Story focus", labelOf(STORY_FOCUS, book.storyFocus as StoryFocus)]);
  const rough = book.tags.filter((t) => t.kind === "rough_genre");
  const unconfirmed = book.tags.some((t) => t.kind !== "rough_genre" && !t.confirmed);

  if (!rows.length && !rough.length) return <p className="text-sm text-muted">Nothing set yet.</p>;
  return (
    <>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {unconfirmed && (
        <p className="mt-2 text-xs text-muted">Dashed values came from your shelf photos and aren&apos;t confirmed yet. Saving the classification confirms them.</p>
      )}
      {rough.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Rough genre from your shelf photos: {rough.map((t) => t.name).join(", ")}. It goes away once you set genres.
        </p>
      )}
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
