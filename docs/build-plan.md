# Home Library Catalog — Build Plan

Owner: Alexandra Theroux · Last updated 2026-10-28 (rev. 4: Smut is a Romance subgenre; fantasy romance, supernatural beings, retellings)

## Purpose and principles

A private catalog of every book Alexandra owns in print, ebook and audio. It helps her read more diverse authors and stories, avoid duplicate purchases, complete series in matching editions, and pick her next read by mood.

- **Owned books only.** A copy that's sold, donated, given away or lost moves to the **Gone list** (with the reason and date, and Undo). A title with no owned copies left drops out of the library, lookup and stats. A copy added by mistake is deleted outright. DNF books are removed, not tracked.
- **Prefill, then edit.** Metadata, classification and representation are pre-filled from public sources. Alexandra can add to, correct or override any field. Each pre-filled field records where it came from.
- **Owner-only.** Only Alexandra can view or edit. No public pages, no sharing links.
- **The catalog is the system of record.** Ratings and reviews are written here. StoryGraph and Goodreads aren't connected.

## Data model

Each title appears once, and every format owned sits inside that one entry.

- **Title (work):** one entry per book. Holds classification, representation, status and the overall review.
  - **Copies:** one per format owned (hardcover, trade paperback, mass-market paperback, ebook, audiobook). Each copy holds edition, ISBN, cover, length, source (shelf, Kobo, Audible, Libro.fm), keepsake notes, loan status, Gone status (reason and date) and a format review.
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
- **Subgenre(s):** the kind of story within a genre. Subgenres can apply across genres (e.g. *Annihilation* = Sci-fi + cosmic horror), from a starter list that Alexandra approves before bulk prefill. Examples: paranormal, monster, hockey/sports, Regency romance, smut; urban, cozy, epic fantasy, fantasy romance (never "romantasy"); retelling; slasher, folk, haunted-house, body, cosmic horror; space opera, solarpunk. Some subgenres go deeper: Fantasy romance, Paranormal romance and Urban fantasy take **supernatural beings** (shifters, vampires, fae, witches/wizards/warlocks, deities), shifters take a **shifter type** (dragons, wolves, bears, big cats, various real animals, various mythological animals), and Retelling takes a **retelling type** (Greek/Roman myths, Celtic/Norse myths, Grimm's fairy tales). The approved lists live in `docs/starter-lists.md`. Ask Alexandra about unclear cases.
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

A separate **story focus** field: *Plot-led*, *Balanced* or *Spice-led*. Spice-led books (sex scenes are most of the story and the plot mainly connects them) get the **Smut** subgenre under Romance, alongside their other subgenres (e.g. Romance › Smut + Monster romance). Story focus is separate from spice: a 5-pepper book with a strong plot stays plain Romance. Pre-filled from reader reports and descriptions; Alexandra can override.

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
- **Ratings:** four scales, from Alexandra's `rating-scales.xlsx` (v2). Labels and descriptions are her wording; don't change them without asking.
  - **Stars** (the main rating): 1.00–5.00 in quarter steps. Each value has its own label and description. The label shows beside the stars everywhere; the description shows in the picker and on the book page. Picker: tap 1–5 stars, then choose among that star's quarters. No slider.
  - **Writing quality** (optional, one tap): 1–5.
  - **Would I recommend it?** (optional): No / Yes, to everyone / Yes, to specific people. Replaces the free-text "who I'd recommend it to" prompt.
  - Writing quality and the recommendation go with a star rating: they can't be set without stars, and clearing the stars clears them.
  - **Audio performance** (optional, audiobook copies only): 1–5, plus an optional note. Part of the format review.
  - All four are filterable, sortable, included in the spreadsheet export, and available to Ask your library.
  - Example: *Beloved* — Stars 3.50 · Writing 5 · Recommend: Yes, to specific people.
- **Review prompts:** free-text review, plus structured prompts: broke my brain / challenged my worldview, mood reactions (funny, cried, page-turner…), would re-read, favourite quote, confirmed spice level.
- **Format review:** per copy: audio performance for audiobooks (above); print or edition quality for physical copies (later).
- **Series review:** an overall review on the series page, alongside each book's review.
- **Collection reviews:** an overall review plus an optional review for each story or essay.

### Stars

| Stars | Label | Description |
|---|---|---|
| 5.00 | All-time favourite | It got under my skin and I'll always own it. Made me cry, made me laugh, made me feel all the feels. Comfort-read territory. |
| 4.75 | Almost perfect | Loved it. I'd only change a few small things to make it perfect. |
| 4.50 | Adored it | Wonderful and moving. A few things I'd change, or it's a bit niche. |
| 4.25 | A great book | Enjoyed it a lot. High quality throughout. |
| 4.00 | Loved it | A genuinely great reading experience. |
| 3.75 | Almost loved it | Really good, with a couple of things holding it back. |
| 3.50 | Really enjoyed it | Entertaining and a good time, not a waste of time. Can be light, fluffy or predictable. |
| 3.25 | Enjoyed it | It was good, but it didn't meet my needs or break my brain. Not one I'd go out of my way to recommend. |
| 3.00 | Liked it | Enjoyable and fun. It did its job. |
| 2.75 | Mixed feelings | Parts worked, parts really didn't. |
| 2.50 | Meh | Didn't love it. |
| 2.25 | It wasn't great | Glad it's over. |
| 2.00 | Struggled with it | More frustrating than enjoyable. |
| 1.75 | Disappointing | A few good bits in a book I mostly didn't like. |
| 1.50 | Really didn't like it | I kept going, but I regret it a bit. |
| 1.25 | Almost hated it | Very little worked for me, but I didn't hate it enough to quit. |
| 1.00 | Hated it | Not for me at all. Couldn't (or barely) finish it. I want my time back. |

### Writing quality

| Score | Label | Description |
|---|---|---|
| 5 | Masterful | Beautiful prose; the words stuck with me. Clearly very well thought out, with great world-building and all that jazz. |
| 4 | Strong | Well written and confident. A good-quality book. |
| 3 | Fine | It was okay. Not groundbreaking. |
| 2 | Rough | Maybe a good premise, but bad follow-through. |
| 1 | Yikes | Very poorly written. A third grader could've done better. |

### Would I recommend it?

| Value | Label | Description |
|---|---|---|
| no | No | I wouldn't recommend it. |
| everyone | Yes, to everyone | I'd recommend it to anyone. |
| specific | Yes, to specific people | Only to the right reader. |

### Audio performance (audiobook copies)

| Score | Label | Description |
|---|---|---|
| 5 | Elevated the book | The narration made it better than reading it myself. |
| 4 | Great narration | Engaging voices and pacing; easy to listen to. |
| 3 | Fine | Did the job; nothing stood out. |
| 2 | Distracting | Voices, pacing or production pulled me out of the story. |
| 1 | Unlistenable | The narration ruined it for me. |

## Views and interactions

Used on a phone in a bookstore, on the couch and at a desk. All adding and editing happens in the app.

- **Browse:** toggle between a cover grid and a sortable table.
- **Sort and filter by every field:** author, artist, publisher, book type, graphic-novel classifications, nonfiction subject, reasons for reading, each representation field, genre, subgenre, trope, vibe, spice, story focus, romantic subplot, read status, format, series, shelf/source, stars, writing quality, recommendation, audio performance, on loan, keepsake, needs review (missing cover, missing author, or a guessed title).
- **Book page:** all fields, every copy owned, reviews, series position, and the source of each pre-filled value. Edit the title, subtitle, contributors, series and book type; change each copy's cover (photo, Open Library, or remove); add a copy; remove a copy.
- **Remove a copy:** "I no longer own it" (Sold / Donated / Gave away / Lost / Other) moves it to the Gone list; "It was added by mistake" deletes it after confirmation, and the whole title if it was the last copy.
- **Gone list:** every copy she's parted with, newest first, each with Undo. Adding a book that's on the Gone list adds it back as a copy of the same title.
- **Bookstore lookup:** one big search box (plus barcode scan) that answers "own it / don't own it" at a glance and shows:
  - every format owned ("audiobook + ebook, no print" flags a collecting candidate)
  - series status: volumes owned and missing, plus the print format and edition of each, with mismatches flagged and the matching format to buy
- **Add a book:** type a title or ISBN, or scan/upload a barcode or cover photo. The app pre-fills the record; Alexandra reviews and saves.
- **Quick edits:** mark read, tick anthology pieces, rate (all four scales), set or clear a loan, add tropes or keepsake notes without leaving the view.
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

1. **Foundation:** private login, database, data model, seed import of the 428 shelf titles, grid and table views, sort/filter, bookstore lookup, quick edits, loans. Done 2026-10-26.
1b. **Edit, add, remove, rate** (brought forward from later phases): edit details, per-copy covers (photo upload or Open Library), needs-review filter, add a book or copy (Open Library search, ISBN barcode scan), Gone list and Added by mistake, the four rating scales. Done 2026-10-28.
2. **Enrichment:** ISBN/metadata lookup, AI prefill of series, publisher, length, genres, subgenres (starter list approved first), tropes, vibe, spice, story focus and author representation with sources; AI fill-in on top of the add-a-book flow (the basic flow and barcode scan shipped in 1b).
3. **Reviews and stats:** review prompts (the rating scales shipped in 1b); format, series and collection reviews; read/unread dashboard; Ask your library.
4. **Ongoing:** digital library imports, ISBNs and exact editions a shelf at a time.

## Open items

- [ ] Resolve the seed entries marked `needs_check` (4 left as of 2026-10-28; the Needs review filter finds them)
- [ ] Approve the starter subgenre and trope lists
- [x] Kobo, Audible and Libro.fm books imported from app screenshots (Phase 1)
- [x] Confirm whether children's/YA novels (e.g. Harry Potter) stay in read/unread stats (only picture books are excluded). Decided 2026-10-23: yes, they stay in stats.
- [x] Split manga runs (Bastard!!, Mars, Ouran) into one entry per volume (done on import)
