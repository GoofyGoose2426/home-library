# Changelog

What's been built, in plain language. Newest first.

## 2026-10-27 · Phase 1b, step 3: Add a book and add a copy

- **+ Add** at the top of the library. Search Open Library by title, author or **ISBN** (the ISBN finds your exact edition, with its publisher and page count), pick the right result, check the details, and save. **Can't find it? Enter it yourself** opens a blank form.
- For your copy, choose:
  - **Format:** hardcover, trade paperback, mass-market, print (not sure), ebook or audiobook. Print copies live on your Bookshelf; ebooks and audiobooks say which app (Kobo, Audible, Libro.fm, Other).
  - Optionally: ISBN, pages, publisher, narrators (audiobooks), and **On loan to** if it's already lent out.
  - Whether to use the search result's cover.
- **No duplicates:** search results you already own say "In your library: …". Picking one offers **Add as another copy** (the default) or **It's a different book**.
- **+ Add a copy** on every book page adds a new format of a book you already have (e.g. the print edition of an ebook).
- Saving is all-or-nothing. Every value is marked "Set by you", and you land on the book's page afterwards. Tested against a throwaway database: 14 checks, all passing.

## 2026-10-26 · Needs review

- Books with something to fix are tagged **⚑ Needs review**: no cover, no author, or a title or author that was a guess from the shelf photos.
- A **⚑ 456 need review** button at the top of the library shows just those books with one tap (tap again to undo). The number goes down as you fix them.
- A new **Needs review** group in Filters: Anything to review, Missing cover, Missing author, Title or author is a guess, each with its count. Plus a **Needs review first** sort.
- The grid shows the flag; the table lists the reasons ("no cover, no author, guessed title").
- Counts checked against the database: 453 missing a cover, 8 missing an author, 11 guessed titles, 456 books in all.
- Books credited only to an artist, editor or translator now count as having an author.

## 2026-10-26 · Phase 1b, step 2: Change a cover

- Every copy on a book page now has **Add a cover** or **Change cover**, with three choices:
  - **Take or choose a photo:** your phone offers the camera or your photos. The app turns it the right way up, shrinks it, and saves it in your private Supabase folder. Only your account can add to that folder or see what's in it; other accounts and logged-out visitors are refused (tested).
  - **Find covers:** search Open Library (the book's title is filled in) and tap the cover that matches the edition you own. Other editions of the best match are included.
  - **Remove** the cover. A removed photo is deleted from storage.
- Your choice is marked "Set by you", so the cover finder never replaces it. Your own photos show first, in the grid, table, lookup and on the book page ("Your photo").
- Each copy card shows its own small cover, so a hardcover and an audiobook can have different ones.

## 2026-10-26 · Phase 1b, step 1: Edit details

- **Edit details** button on every book page: title, subtitle, the people on the book with their role (author, writer, artist, editor, translator) in the order you choose, series and number, book type, and narrators on each audiobook copy.
- Names and series you already have are suggested as you type, so "Amanda Quick" stays one person and "Kate Daniels" one series.
- Tick **"These details are right now"** to remove a book's "Needs checking" flag.
- Saving is all-or-nothing: if anything is wrong (e.g. an empty title), nothing changes and you see why. Your edits are marked "Set by you" so no later fill-in overwrites them. Tested against a throwaway database: 11 checks, all passing.

## 2026-10-26 · Phase 1 complete (step 14 demo)

- Walked through every screen with your real library at phone and desktop size, in light and dark mode, and re-ran the privacy, security and data checks. Everything passes. The full review and tidy-up list is in `docs/phase-1-review.md`.
- Small fix: on colour cards, the ✎ button no longer covers the author's name.

## 2026-10-26 · Phase 1, step 13: Phone app and safety nets

- **Add to Home Screen:** the app now has its own icon (three books on a terracotta shelf) and the name "Library", and opens full-screen like an app.
- **Download my library**, at the bottom of the home page:
  - **Spreadsheet (CSV):** one row per copy with title, authors, series, status, rating, genres, format, where it lives, edition, ISBN, narrators, loans and keepsake notes. Opens in Numbers or Excel.
  - **Full backup (JSON):** every table, for a complete restore.
  - Tested on your real library: 1,099 rows in the spreadsheet, and every table in the backup.
- **Daily check-in:** once a day, Vercel pings the database so the free Supabase plan never pauses it. The ping reads no data and only works with a private value (`CRON_SECRET`) that you set in Vercel.

## 2026-10-26 · Phase 1, step 12: Bookstore lookup

- A **Do I own it?** button at the top of the library opens one big search box, ready to type.
- Answers at a glance as you type: **✓ You own it**, **✓ You own books in this series**, or **✗ Not in your library**. Typing the first letters of each word is enough ("dream of y").
- Each match shows every copy you own ("Bookshelf + Kobo ebook + Kobo audiobook"), read status and loans. Books with no print copy are marked "No print copy yet".
- **Series:** the volumes you own in order, **missing volumes** in between, volumes with no print copy, and, once print types are set, which print type to buy to match your shelf (with any mismatches flagged). Prequels and novellas (#0, #1.5) are listed separately.
- Gaps count up to the highest volume you own. Later volumes appear once series details are filled in (Phase 2). Barcode scanning also comes in Phase 2.
- The home page header now wraps onto two rows on a phone, so all its buttons fit.

## 2026-10-26 · Phase 1, step 11: Quick edits

- A **✎** button on every cover and table row opens a quick-edit panel without leaving your list. The same panel is in the **Update** section of each book page.
- **Read / Unread** in one tap. Collections get a tick list of their stories or essays instead, and become Partly read or Read as you tick.
- **Rating** in quarter stars: tap a star or slide for quarters, with your label underneath (e.g. "4 · Loved it, but it's not for everyone"). Ratings show in the grid, the table and on the book page.
- **On loan to** (print copies only): type a name and tap Lend; tap **Returned** to clear it.
- **Keepsake notes** on any copy, and the **Reference** switch that leaves a book out of stats.
- **Print type** per Bookshelf copy, or in batches: tap **Select**, pick books (tip: filter by "Print (type not set)" first, or "Select all"), then tap Hardcover, Trade paperback or Mass-market. Ebooks and audiobooks are never changed.
- Every edit is saved straight away and marked **Set by you**, so no later fill-in can overwrite it. If saving fails, the change is undone and you see a message.
- Tested against a throwaway copy of the database: 10 checks, all passing.

## 2026-10-26 · Phase 1, step 10: Book page

- Tap any cover or table row to open the book's own page. **← Library** takes you back to the list as you left it, with search and filters kept.
- Shows a big cover (or colour card), title, authors, series with its number, read status, book type, and whether it's left out of stats. Any "Needs checking" note shows too.
- **Your copies:** one card per format, saying where it lives (Bookshelf, Kobo, Audible, Libro.fm), plus edition, ISBN, narrators, length, keepsake notes and loans when known.
- **Series:** every volume you own, in order, each one tappable. Tapping the series name shows the whole series in the library.
- **Sources:** small grey text under each value says where it came from ("From your photos and screenshots · not confirmed yet", "Open Library", "Set by you").
- A note lists what Phase 2 will fill in: subgenres, tropes, vibe, spice, story focus, publisher, length and representation.

## 2026-10-26 · No more bookcase locations

- At your request, the app no longer tracks which bookcase a book is on. Print copies now just say **Bookshelf**. Ebooks and audiobooks say which app they're in, e.g. "Kobo ebook", "Libro.fm audiobook".
- Removed the Shelf filter, Shelf sort and Shelf column, and deleted the bookcase names from the database. The "Where it lives" filter (Bookshelf, Kobo, Audible, Libro.fm) stays.
- The photo transcriptions in `data/import/` still mention bookcases, because that's where each photo was taken.

## 2026-10-26 · Phase 1, step 9: Sort and filter

- A search box on the home page that finds titles, authors and series as you type (accents don't matter).
- **Sort** by title (ignoring "The"/"A"), author surname, series order, shelf or read status.
- **Filters** panel: read status, format (including "Print, type not set" for step 11), rough genre, shelf, where it came from (shelf photos, Kobo, Audible, Libro.fm), series, on loan, keepsake, reference/left out of stats, and needs checking. Each choice shows how many books it has.
- Choices in one group widen the list (Romance *or* Fantasy). Choices across groups narrow it (Unread *and* Fantasy). Applied filters show as chips you can tap off one at a time.
- Filters live in the page address, so reloading or coming back keeps them.
- Tested with your real library: "Unread + Fantasy & paranormal + Pine bookcase · fantasy & literary" gives 20 books, matching a direct count.

## 2026-10-26 · Phase 1, step 8: Cover grid and table

- The home page now shows your whole library: 1,058 books, A to Z.
- **Covers** view: the cover (or colour card), title, author, "✓ Read" and the formats you own. 3 across on a phone, up to 7 on a big screen.
- **Table** view: title, series, author, read status, format and shelf. On a phone, author and format fold in under the title so nothing scrolls sideways.
- The app remembers which view you used last on each device. Checked at phone width and on desktop, in light and dark mode.

## 2026-10-26 · Phase 1, step 7: Best-guess covers

- Looked up every book on Open Library (free). **781 books now have a cover**, labelled "unconfirmed" until the copy has an ISBN. The 3 Libro.fm audiobooks found by ISBN are confirmed. 277 books show a warm colour card with the title and author instead.
- I dropped 12 matches that looked like the wrong book or edition (e.g. the Hobbit graphic novel matched the novel) rather than show a wrong cover.
- New **Check covers** page: tap a wrong cover to remove it. Removed covers are remembered, so a later lookup won't put them back.
- Google Books needs a free API key to fill the remaining gaps. Not set up yet.
- Fixed two mistakes from step 5: a fake book called "87" (a note of mine that slipped into the book list) is gone, and "Notes to Myself" now shows Hugh Prather as its author. Your library has 1,058 books.

## 2026-10-23 · Phase 1, step 6: Import review and save

- A "Check your import" screen for the 53 uncertain items. Choices save as you go.
- You decided all 53 and saved: **1,059 books and 1,100 copies** are now in your library (733 read, 326 unread), with 607 people, 193 series and rough genres from the shelf photos.
- 10 uncertain books were left out, including Mars Vol. 3. 11 are kept with a "check later" flag. Libro.fm: 15 read, 15 unread. "Burnout" is Read. The Janell Cannon picture book is one book.
- Saving is protected: an interrupted save resumes without duplicates, and a finished import can't run again and bring back books you've removed.

## 2026-10-23 · Phase 1, step 5: Reading your photos

- Read all 36 shelf photos, 32 Kobo ebook screenshots, 14 audiobook screenshots and the Libro.fm list. Your originals in `Books/` were only read, never changed.
- Found 1,069 titles and 1,110 copies (560 print, 375 ebooks, 175 audiobooks), including about 90 print books the earlier list missed.
- Split the manga runs into single volumes, fixed a dozen uncertain titles from the photos, and matched ebooks and audiobooks to print books you already own (35 titles in more than one format).
- 53 items are waiting for your review in step 6. Nothing is in the database yet. Details: `docs/import-summary.md`.

## 2026-10-23 · Phase 1, step 4: Login

- Real sign-in with email and password. Only actheroux@live.ca can get in, and there's exactly one account in Supabase.
- "Forgot your password?" emails a link to a "Choose a new password" page. Passwords need at least 10 characters. The email itself is Supabase's standard one; the free plan doesn't allow changing its wording.
- A Sign out button, and the sign-in page skips straight to your library when you're already signed in.
- Tested by you on your phone and laptop: sign-in works, a wrong password is refused, and sign out works.
- Dark-mode buttons now use dark text so they're easy to read.

## 2026-10-23 · Phase 1, step 3: Database

- Built the whole library database in Supabase: 14 tables covering titles, copies, series, people and credits, collection pieces, author identity, character representation, tags, reviews, field sources, saved reports and the import review list. There's also a private place for cover images.
- Every table is locked to your account. Tested live: a logged-out visitor is refused on all 14 tables and can't add anything. Supabase's security advisor finds no problems.
- Built-in rules: one title can hold several formats; ratings go in quarter stars; author identity can't be saved without a link to the author's own words; once you've set a value, AI fill-in can't overwrite it.
- Database changes are saved as "migrations" in `supabase/migrations/`, so they can be re-applied the same way every time.

## 2026-10-23 · Phase 1, step 2: Empty app online

- The app is live at https://home-library-mocha.vercel.app. Every page sends visitors to a private sign-in screen; the real sign-in form arrives in step 4.
- The code lives in a private GitHub repository (GoofyGoose2426/home-library). Your `Books/` photos and the private settings file (`.env.local`) stay on your Mac and are never uploaded.
- Only actheroux@live.ca will be let in, checked on every page, and sign-ups are switched off in Supabase.
- Warm cream and terracotta colours, with a dark mode, checked at phone width.
- Next.js was updated to 16.4.2 to fix three published security flaws in 16.4.0.

## 2026-10-23 · Phase 1, step 1: Accounts

- Approved the database design and the Phase 1 plan (`docs/phase-1-plan.md`).
- Created free GitHub, Supabase and Vercel accounts. The Supabase project `home-library` is in Canada (Central), and new sign-ups are switched off.
- Installed Node.js on the Mac so the app can be built and run.
- Decided that children's and YA novels count in read/unread stats.
