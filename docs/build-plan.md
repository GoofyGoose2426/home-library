# Home Library Catalog — Build Plan

Owner: Alexandra Theroux · Last updated 2026-10-23 (rev. 2)

## Purpose and principles

A private catalog of every book Alexandra owns in print, ebook and audio. It helps her read more diverse authors and stories, avoid duplicate purchases, complete series in matching editions, and pick her next read by mood.

- **Owned books only.** Books leave the catalog when they're sold, donated or given away. DNF books are removed, not tracked.
- **Prefill, then edit.** Metadata, classification and representation are pre-filled from public sources. Alexandra can add to, correct or override any field. Each pre-filled field records where it came from.
- **Owner-only.** Only Alexandra can view or edit. No public pages, no sharing links.
- **The catalog is the system of record.** Ratings and reviews are written here. StoryGraph and Goodreads aren't connected.

## Data model

Each title appears once, and every format owned sits inside that one entry.

- **Title (work):** one entry per book. Holds classification, representation, status and the overall review.
  - **Copies:** one per format owned (hardcover, trade paperback, mass-market paperback, ebook, audiobook). Each copy holds edition, ISBN, cover, length, source (shelf, Kobo, Audible, Libro.fm), keepsake notes, loan status and a format review.
- **Series:** links titles in reading order (name + number). Has its own overall review and shows owned vs. missing volumes, plus the print format and edition of each.
- **Collections** (anthologies, short story collections, essay collections, poetry collections): a title with a table of contents of individual pieces. Each piece has its own author(s), a read checkbox and an optional review.
- **Excluded category:** colouring books, art/craft references, picture books, and reference books (cookbooks, home guides like *Safe and Sound*) stay in the catalog but are left out of read/unread stats. A **reference** toggle on each title lets Alexandra decide per book.
- **Manga and comics runs:** each volume is its own title within a series, so gaps and duplicates show up.

## Book fields

| Field | Level | Filled by | Notes |
|---|---|---|---|
| Title, author(s) | Title | Prefill | Contributors listed for collections |
| Series name and number | Title | Prefill | Feeds series gaps |
| Publisher | Copy | Prefill | From spine or ISBN |
| Format | Copy | Prefill / Alexandra | Hardcover, trade paperback, mass-market, ebook, audiobook |
| Book type | Title | Prefill | Prose, Graphic novel, Manga, Comic collection, Picture book, Poetry |
| Reasons for reading | Title | Alexandra | Multi-select, on every book: Work / professional development, Personal growth, Activism & unlearning, Curiosity, Research for a project, Comfort / escape, Book club, Gift / recommended to me; extendable |
| Edition, ISBN, cover art | Copy | ISBN lookup | Best-guess cover marked "unconfirmed" until an ISBN is added |
| Length | Copy | Prefill | Pages (print), hours and minutes (audio), estimated word count for all formats |
| Source | Copy | Import | Shelf photos, Kobo, Audible, Libro.fm |
| Keepsake notes | Copy | Alexandra | Free text: signed, heirloom, gift from… |
| On loan to | Copy | Alexandra | Name only; cleared on return; still counts as owned. No dates, no history |

Word counts are estimates from page count and trim size, or from audio length (about 9,000–10,000 words per hour).

## Classification

Every title gets genre, subgenre, tropes, vibe and a romantic-subplot flag. All are pre-filled and editable, and Alexandra can add new values to every list.

- **Genre(s):** the broad shelf. A book can have more than one (e.g. Romance + Fantasy).
- **Subgenre(s):** the kind of story within a genre. Subgenres can apply across genres (e.g. *Annihilation* = Sci-fi + cosmic horror), from a starter list that Alexandra approves before bulk prefill. Examples: paranormal, shifter, monster, hockey/sports, Regency romance; urban, cozy, epic fantasy, romantasy; slasher, folk, haunted-house, body, cosmic horror; space opera, solarpunk. Ask Alexandra about unclear cases.
- **Tropes:** for all genres, from a curated list Alexandra can extend (enemies to lovers, grumpy/sunshine, forced proximity, found family, chosen one, final girl…).
- **Vibe:** on every book, fiction and nonfiction (no formal content warnings). A main vibe and an optional second one: Cozy/feel-good → Light/fun → Dramatic/heavy → Intense/dark.
- **Romantic subplot:** yes/no on every book.
- **Spice:** on any book with romance, including subplots, rated on the Scoville Smut Scale. Books with no romance have no spice rating.

### Spice: the Scoville Smut Scale (adapted from Carrie Ward, @authorcarrieward)

| Pepper | On the page |
|---|---|
| Green pepper | They fall in love; the door stays firmly shut |
| Yellow pepper | Making out and some heavy petting; sex is implied, not shown |
| Orange pepper | It happens on page, but in vague euphemisms |
| 1 red pepper | On-page sex, still discreet language |
| 2 red peppers | Fully on page, but the language stays fairly polite |
| 3 red peppers | Explicit and frequent across several chapters, nothing unfamiliar |
| 4 red peppers | Kink, BDSM and group scenes are in play |
| 5 red peppers | The most explicit end of the scale |

### Romance vs. smut

A separate **story focus** field: *Plot-led*, *Balanced* or *Spice-led*. Spice-led books (sex scenes are most of the story and the plot mainly connects them) get **Smut** as their primary genre in place of Romance, followed by their other genres or subgenres (e.g. *Smut + Monster*, *Smut + Fantasy*). Story focus is separate from spice: a 5-pepper book with a strong plot stays Romance. Pre-filled from reader reports and descriptions; Alexandra can override.

## Graphic novels and manga

Graphic novel is a **book type**, not a genre or a physical format. Genres, subgenres, tropes, vibe and spice still apply as for any book.

- **Credits:** Writer and Artist (illustrator / primary artist). Colourists and letterers aren't tracked. Both writer and artist count toward author representation stats.
- **Publisher** is shown prominently and is filterable (Image, Del Rey, Webtoon, DC, Marvel, Oni…).
- **Graphic-novel classifications** (all filterable):
  - Origin/style: Manga, Western comics, Webcomic/Webtoon collection, Graphic memoir, Adaptation
  - Manga demographic: shōjo, shōnen, seinen, josei, BL
  - Universe/franchise: Batman, Marvel, Serenity/Firefly, standalone…
  - Edition type: single volume, omnibus/complete edition, deluxe hardcover
- **Omnibus and collected editions** record which volumes they contain, plus a note for bonus content. Series status and bookstore lookup account for them, e.g. "you already have Vols. 1–2 in the omnibus."

## Nonfiction

- **Genre:** Nonfiction. **Subgenre = type:** Memoir, Essays, History, Guide/How-to, Self-help, Popular science, Reference…
- **Subject(s):** multi-select, e.g. Social justice & anti-racism, Indigenous history & Canada, Leadership & work, Health, bodies & sexuality, Wellbeing & rest, Feminism, Celebrity, First voice. Starter list approved by Alexandra; extendable. Example: *Want* = Nonfiction › Essays › Feminism, Sexuality, Celebrity.
- **Essay collections** work like short story collections: a checklist of essays, progress, partly read status, and a review for each essay.
- **Reference books** (cookbooks, home guides) are excluded from stats via the reference toggle.
- **Vibe** applies; tropes don't.

## Representation

Representation data exists to make reading more intentional.

- **Author fields:** gender identity, race/ethnicity, 2SLGBTQIA+, disability, neurodivergence, nationality/region (e.g. Atlantic Canadian, Indigenous nation). Pre-filled **only** from the author's own public self-identification (bio, interviews, own-voices notes), with the source URL recorded. Otherwise "unknown". Never inferred from a name, photo or anything else.
- **Main character fields:** the same categories, pre-filled from publisher descriptions and community representation tags, then confirmed or added by Alexandra.
- **Own-voices flag:** set when the author shares the main character's identity.
- **Anthologies:** count as one book, but every contributor's representation feeds into the author stats.
- **Stored at author level:** an author's details are entered once and apply to all their books.

## Reading status, ratings and reviews

- **Status:** Unread / Read. Collections can also be **Partly read** (e.g. 6 of 14 pieces) and become Read only when every piece is ticked. The excluded category has no status in stats. No dates are tracked.
- **Rating:** quarter stars (0.25 steps), shown with the scale label below.
- **Review prompts:** free-text review, plus structured prompts: broke my brain / challenged my worldview, mood reactions (funny, cried, page-turner…), would re-read, favourite quote, who I'd recommend it to, confirmed spice level.
- **Format review:** per copy, e.g. narrator performance for audio, print or edition quality for physical.
- **Series review:** an overall review on the series page, alongside each book's review.
- **Collection reviews:** an overall review plus an optional review for each story or essay.

| Stars | Means |
|---|---|
| 5 | I'd tell everyone to read this |
| 4 | Loved it, but it's not for everyone |
| 3 | Fun, I liked it, but I wouldn't necessarily recommend it |
| 2 | It wasn't great |
| 1 | I hated it |

## Views and interactions

Used on a phone in a bookstore, on the couch and at a desk. All adding and editing happens in the app.

- **Browse:** toggle between a cover grid and a sortable table.
- **Sort and filter by every field:** author, artist, publisher, book type, graphic-novel classifications, nonfiction subject, reasons for reading, each representation field, genre, subgenre, trope, vibe, spice, story focus, romantic subplot, read status, format, series, shelf/source, rating, on loan, keepsake.
- **Book page:** all fields, every copy owned, reviews, series position, and the source of each pre-filled value.
- **Bookstore lookup:** one big search box (plus barcode scan) that answers "own it / don't own it" at a glance and shows:
  - every format owned ("audiobook + ebook, no print" flags a collecting candidate)
  - series status: volumes owned and missing, plus the print format and edition of each, with mismatches flagged and the matching format to buy
- **Add a book:** type a title or ISBN, or scan/upload a barcode or cover photo. The app pre-fills the record; Alexandra reviews and saves.
- **Quick edits:** mark read, tick anthology pieces, rate, set or clear a loan, add tropes or keepsake notes without leaving the view.
- **Bulk import:** CSV import for batches of ISBNs and digital library exports (Kobo, Audible, Libro.fm).

## Stats and reports

The only fixed report is read vs. unread. All stats cover owned books only and leave out the excluded category.

- **Read vs. unread dashboard:** the split (read / partly read / unread). Either side can be broken down by any field, e.g. "40% unread, and of those, 35% horror." Colourful charts in the style of StoryGraph's stats.
- **Ask your library:** a question box. Alexandra types a question; the app answers with a chart, table or short answer built from her data. Examples: "Which queer-authored horror haven't I read?", "How do author demographics compare between my read and unread books?", "Which books do I own in more than one format?", "What's my average rating by author representation in fantasy?"
- **Save a report:** pin any answer to the dashboard.
- **Export:** any list or table as CSV.

## Look and feel

Fable's warmth with StoryGraph's information.

- Warm, soft colours, rounded covers and cards, friendly copy. Light and dark mode.
- Book pages with StoryGraph-level detail, laid out to scan easily.
- Reviewing, sorting and filtering take as few taps as possible (StoryGraph is clunky here).
- Colourful, graphic stats.
- Phone first for the bookstore lookup; desk-friendly layout for reports and reviews.

## Build phases

1. **Foundation:** private login, database, data model, seed import of the 428 shelf titles, grid and table views, sort/filter, bookstore lookup, quick edits, loans.
2. **Enrichment:** ISBN/metadata lookup, AI prefill of series, publisher, length, genres, subgenres (starter list approved first), tropes, vibe, spice, story focus and author representation with sources; add-a-book flow with barcode scan.
3. **Reviews and stats:** ratings and review prompts; format, series and collection reviews; read/unread dashboard; Ask your library.
4. **Ongoing:** digital library imports, ISBNs and exact editions a shelf at a time, cover uploads.

## Open items

- [ ] Resolve the 35 seed entries marked `needs_check`
- [ ] Approve the starter subgenre and trope lists
- [ ] Send Kobo, Audible and Libro.fm exports
- [x] Confirm whether children's/YA novels (e.g. Harry Potter) stay in read/unread stats (only picture books are excluded). Decided 2026-10-23: yes, they stay in stats.
- [ ] Split manga runs (Bastard!!, Mars, Ouran) into one entry per volume
