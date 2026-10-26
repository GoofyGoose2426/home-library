# Changelog

What's been built, in plain language. Newest first.

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
