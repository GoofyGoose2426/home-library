# Home Library — Stack, Schema and Phase 1 Plan

Draft for Alexandra's approval · 2026-10-23 · No code is written until this is approved.

## Your decisions so far

| Question | Your answer |
|---|---|
| When do ebooks and audiobooks go in? | Phase 1, together with print. One entry per title, every format as a copy inside it. |
| Audible read status | Only books Audible marks **Finished** count as Read. Not started, in progress and "<1 min left" all count as Unread. |
| Libro.fm read status | All 33 go on a list, and you tick Read or Unread for each one. |
| Children's and YA novels in stats | Yes, they count. Only picture books (and anything you switch to Reference) are left out. |
| Login | **actheroux@live.ca**, email + password. No other account can exist. |
| Web address | Free Vercel address (e.g. `home-library-xyz.vercel.app`) |
| Supabase plan | Free, plus a daily check-in so it never pauses and a "Download my library" backup button |

---

## 1. Stack and accounts

| Piece | What it does for you | Account you'll create | Monthly cost |
|---|---|---|---|
| **GitHub** | Stores the app's code and its history | Yes (free) | $0 |
| **Supabase** (free plan) | Database, your login, cover image storage | Yes (free) | $0 (500 MB database and 1 GB of files: many times what ~1,000 books need) |
| **Vercel** (Hobby plan) | Puts the app on the web so it works on your phone | Yes, sign in with GitHub | $0 (Hobby is for personal, non-commercial use, which this is) |
| **Open Library** | Book details and covers | None needed | $0 |
| **Google Books** | Backup source for details and covers | None needed at your volume | $0 |
| **Anthropic API** | AI prefill and "Ask your library" | **Not needed until Phase 2.** I'll ask before setting it up. | See below |
| App code | Next.js, TypeScript, Tailwind CSS, installable on your phone like an app | — | $0 |

**Phase 1 total: $0 a month.**

### Claude API estimate (Phase 2 onward, US dollars, about ×1.4 in CAD)

Prices: Claude Opus 5.5 costs $4 per million words-in and $20 per million words-out (roughly; it's measured in "tokens"). Claude Sonnet 5.5 is half that. Web searches cost $10 per 1,000.

| Use | How often | Opus 5.5 | Sonnet 5.5 |
|---|---|---|---|
| Bulk prefill: genres, tropes, vibe, spice, story focus, series (~600 titles) | **Once** | ~$15–25 | ~$8–12 |
| Author representation lookup, with web search for each author's own words (~400 authors) | **Once** | ~$30–60 | ~$15–30 |
| New books added (~10 a month) | Monthly | ~$1–2 | under $1 |
| Ask your library (~30 questions a month) | Monthly | ~$1–3 | ~$1 |

- **One-time setup: about $25–85 USD**, depending on the model. Running the bulk job through Anthropic's overnight "batch" mode cuts that roughly in half.
- **Ongoing: about $2–5 USD a month.**
- You prepay credits (minimum $5) and set a hard monthly spending cap, so it can never run away. I'll ask you to choose a model and a cap when we start Phase 2.

Reading your photos and screenshots for the Phase 1 import happens here in Claude Code, under your existing Claude subscription. It doesn't use the API and costs nothing extra.

---

## 2. Database schema (the whole plan)

### Diagram

```
                           ┌──────────────┐
                           │    SERIES    │  name, overall review
                           └──────┬───────┘
                                  │ has many (in reading order)
                                  ▼
┌──────────────┐  credits  ┌──────────────┐  has many  ┌──────────────┐
│   PEOPLE     │◄─────────►│    TITLES    │───────────►│    COPIES    │
│ authors,     │ (author,  │ one per book │            │ one per      │
│ writers,     │  writer,  │ status,      │            │ format owned │
│ artists,     │  artist,  │ classifica-  │            │ ISBN, cover, │
│ editors,     │  editor,  │ tion, spice, │            │ length,      │
│ narrators    │ narrator) │ vibe, rating │            │ loan, notes  │
└──────┬───────┘           └──┬────┬───┬──┘            └──────────────┘
       │                      │    │   │
       │ self-identified      │    │   │ has many (collections only)
       ▼                      │    │   ▼
┌──────────────┐              │    │ ┌──────────────┐
│ AUTHOR       │              │    │ │   PIECES     │ stories, essays,
│ IDENTITY     │              │    │ │ read tick,   │ poems: own authors
│ + source URL │              │    │ │ own review   │ and review
└──────────────┘              │    │ └──────────────┘
                              │    ▼
┌──────────────┐              │  ┌──────────────┐
│ CHARACTER    │◄─────────────┘  │ TAGS         │ genres, subgenres,
│ REPRESENT-   │                 │ (taxonomy)   │ tropes, subjects,
│ ATION        │                 │ + book links │ reasons, moods,
│ + source     │                 └──────────────┘ franchises…
└──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   REVIEWS    │  │ FIELD        │  │ SAVED        │  │ IMPORT       │
│ for a title, │  │ SOURCES      │  │ REPORTS      │  │ REVIEW LIST  │
│ copy, series │  │ where every  │  │ pinned       │  │ uncertain    │
│ or piece     │  │ prefilled    │  │ answers from │  │ reads and    │
│              │  │ value came   │  │ Ask your     │  │ matches      │
│              │  │ from         │  │ library      │  │ waiting on you│
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### In plain language

**Titles** are the heart of it: one row per book, however many formats you own. A title holds what's true of the *story*: read status (Unread / Partly read / Read), book type (Prose, Graphic novel, Manga, Comic collection, Picture book, Poetry), the **Reference** switch that leaves a book out of stats, romantic subplot yes/no, spice (green pepper → 5 red peppers, or none), story focus (Plot-led / Balanced / Spice-led), main and second vibe, own-voices flag, graphic-novel style, manga demographic and franchise, and its place in a series (number, which can be 1.5 for novellas).

**Copies** sit inside a title, one per format you own: hardcover, trade paperback, mass-market, ebook or audiobook. Each copy has its own publisher, edition, ISBN, cover, length (pages, or hours and minutes), estimated word count, where it lives (Bookshelf for print; Kobo, Audible or Libro.fm for digital), keepsake notes and **On loan to** (just a name, cleared on return). Omnibus copies list which volumes they contain, so the app knows "you already have Vols. 1–2 in the omnibus."

**Series** link titles in reading order and hold the series review. The app works out owned vs. missing volumes and flags mismatched print formats.

**People** are every author, writer, artist, editor and narrator, entered once. **Credits** connect people to titles (or to individual pieces, or to an audiobook copy for narrators). Writers and artists both count in representation stats; narrators don't.

**Author identity** is stored once per person and applies to all their books. Each value (e.g. "queer", "Mi'kmaw", "autistic") has to carry a source URL to the author's own words. If there's no row, the app shows **unknown**. Nothing is ever guessed.

**Character representation** belongs to a title and records the source too (publisher description or community rep tags), until you confirm or change it.

**Pieces** are the stories, essays or poems inside a collection. Each has its own authors, a Read tick and an optional review. A collection becomes Read only when every piece is ticked; until then it's Partly read (e.g. 6 of 14).

**Tags** are one flexible list of everything you can add to: genres, subgenres, tropes, nonfiction subjects, reasons for reading, mood reactions and franchises. A book can have several genres, with one marked primary (so a Spice-led book shows **Smut** first). New tags you create appear in every picker.

**Reviews** can belong to a title, a copy (narrator, print quality), a series or a piece. They hold the quarter-star rating, free text and your prompts: broke my brain, mood reactions, would re-read, favourite quote, who I'd recommend it to, confirmed spice.

**Field sources** is the safety net behind rules 2, 3 and 8. For every pre-filled value it records where it came from (`openlibrary`, `googlebooks`, `claude`, a URL, or `alexandra`) and whether you've confirmed it. Once you edit something, it's marked `alexandra`, and no later prefill can overwrite it.

**Saved reports** store an Ask-your-library question and how to redraw its chart, so you can pin it to the dashboard.

**Import review list** holds every uncertain item from the photo import (a blurry spine, a doubtful match between an ebook and a print copy, a Libro.fm book you need to tick) until you decide.

**Privacy:** every table is locked with Supabase's Row Level Security, so only your logged-in account can read or write anything. Sign-ups are switched off, and there are no public pages or share links.

---

## 3. Phase 1 plan: Foundation

Each step ends with something you can check. I'll stop after each one for your OK.

| # | Step | What you'll check |
|---|---|---|
| 1 | **Accounts.** I walk you through GitHub, Supabase and Vercel one click at a time, and where to paste each key (never into chat). | You can log in to all three. |
| 2 | **Empty app online.** Project set up, published to your Vercel address, with a "coming soon" page behind the login wall. | It opens on your phone. |
| 3 | **Database.** All tables from the schema above, locked to you, written as re-runnable "migrations". | I show you the tables in Supabase, and prove that a logged-out visitor gets nothing. |
| 4 | **Login.** Email + password for actheroux@live.ca only, sign-ups off, password reset by email. | You log in on phone and laptop. Any other email is refused. |
| 5 | **Reading your photos.** I read all 36 shelf photos, 32 Kobo screenshots, 14 Audible/Libro.fm screenshots and the Libro.fm file. I cross-check them against the 428-row seed, split the manga runs into single volumes, and match ebooks and audiobooks to print titles you already own. Your originals are never moved or changed. | A short summary: how many titles, how many copies, how many items need your eye. |
| 6 | **Import review screen.** One list on your phone: uncertain titles and authors (including the 35 flagged seed rows), uncertain ebook/audio matches, Read/Unread conflicts, and the 33 Libro.fm books to tick. Nothing is saved until you finish. Saving can be safely re-run. | You go through the list. Your library appears. |
| 7 | **Best-guess covers.** Each title gets a cover from Open Library or Google Books, labelled "unconfirmed" until it has an ISBN. Books with no match get a warm placeholder card. | Most covers look right. Wrong ones are easy to spot. |
| 8 | **Cover grid and table.** Toggle between the two, at phone width and on desktop, in light and dark mode. | Scroll your whole library on your phone. |
| 9 | **Sort and filter.** Title, author, format, read status, genre (rough, until Phase 2), series, where it lives (Bookshelf / Kobo / Audible / Libro.fm), on loan, keepsake, Reference, needs-check. Every other field joins the filters as it gets filled in Phase 2. | "Unread fantasy I own in print" works in a few taps. |
| 10 | **Book page.** All fields, every copy, series position, and the source of each value. | Open a book you own in two formats. |
| 11 | **Quick edits.** Without leaving the view: mark read, tick collection pieces, rate (quarter stars with your labels), set or clear On loan to, keepsake notes, Reference switch, and a fast format picker (hardcover / trade / mass-market) so you can fix the "Print, type not set" books a batch at a time. | Lend a book, then clear the loan. Set formats for a batch of books. |
| 12 | **Bookstore lookup.** One big search box that says **Own it / Don't own it** at a glance: every format you own ("audiobook + ebook, no print" is flagged), and series volumes owned vs. missing wherever series data exists (the manga runs at first; the rest fills in during Phase 2). | Search five books standing at your shelf. |
| 13 | **Phone app and safety nets.** "Add to Home Screen" app icon, "Download my library" backup (CSV + JSON), daily database check-in, and `docs/CHANGELOG.md` in plain language. | Install the icon. Download a backup. |
| 14 | **Demo.** A walkthrough of everything above at 390 px wide, in light and dark mode. | You say Phase 1 is done. |

### Moved to Phase 2, as in the build plan

Barcode scanning and add-a-book, ISBN and exact-edition lookup, and all AI prefill (genres, tropes, vibe, spice, representation). Your quick-edit rating works in Phase 1; the full review form comes in Phase 3.

### Open items this closes

- [x] Children's/YA novels stay in stats (decided above). With your OK, I'll tick this in `build-plan.md`.
- [ ] 35 `needs_check` seed rows: resolved in step 6.
- [ ] Manga runs split into single volumes: step 5.
- [ ] Digital library exports: the screenshots and the Libro.fm file cover this. Phase 4 still handles future exports.
