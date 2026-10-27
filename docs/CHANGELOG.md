# Changelog

What's been built, in plain language. Newest first.

## 2026-10-27 · Phase 2, step 4: To check

- **To check** (first in Tools): everything filled in for you that you haven't confirmed. Right now that's about 3,460 values:
  - 749 descriptions
  - 848 first-published years
  - 847 typical lengths
  - 738 word estimates
  - 11 series
  - 248 genres and 20 subgenres from your shelf photos
- **By field:** each field with its count and where the values came from, plus **Confirm all** (with an "Are you sure?" step) for a field you trust, such as years.
- **By book:** every book with something waiting, its values together.
- **On each value:**
  - **✓ Confirm** keeps it, along with its source.
  - **Edit** makes it yours (descriptions, numbers, publisher).
  - **✕ Reject** clears it for good: a later look-up never brings it back, and a rejected genre is never suggested again.
  - Series are changed with Edit details on the book page.
- Your imported titles, authors and read statuses aren't listed: they came from your own photos and you reviewed them during the import. Covers keep their own **Check covers** page.
- **Tested:**
  - 13 database checks (confirm, edit, reject, never brought back, confirm all leaves your values alone, privacy).
  - All earlier tests still pass, after one update: a viewer of the share link without a valid link now gets an empty answer rather than "permission denied", and still sees nothing.
  - A phone-width check in light and dark mode.

## 2026-10-27 · Google Books key found

- The app was looking for a key named `GOOGLE_BOOKS_API_KEY`, but yours in Vercel is `GOOGLE_BOOKS_KEY`, so Google Books was never used (every filled-in value so far came from Open Library). The app now accepts either name.

## 2026-10-27 · Fill in details keeps going when Open Library is slow

- If Open Library doesn't answer for a book, that book is set aside ("It'll be checked next time") and the run carries on, instead of stopping.
- If no book in a batch gets an answer, the run pauses with "Open Library isn't answering right now. Tap Carry on in a few minutes." Nothing is lost.
- Tested against today's slow Open Library: one book timed out and was set aside; the other five were filled in as usual.

## 2026-10-27 · Share link (view only)

- **Sharing** (in Tools): turn sharing on, copy the link, see what viewers see, reset the link (the old one stops working at once), or turn it off.
- **What viewers get, at /s/…:** "Alexandra's library" with:
  - the covers grid and table, search, filters and sorts
  - book pages, ratings and classification
  - "Does she own it?", which says "Alexandra owns it" rather than "You own it"
- **What viewers never get:**
  - loans, keepsake notes or the Gone list
  - "Needs review" flags or sources
  - any edit button or tool, or backups
- **Privacy is enforced by the database itself:**
  - Loans and keepsake notes can't be read at all through the link.
  - Copies on the Gone list are filtered out.
  - Viewers can only read, never write.
  - A wrong or turned-off link sees nothing.
  - Search engines are asked not to list the pages, and the link's address isn't passed on to other sites.
- Your own 19 cover photos stay private. Viewers see the Open Library cover or the colour card for those copies.
- Project rule 1 now allows this one view-only link (`CLAUDE.md`, `docs/build-plan.md`, `docs/sharing-plan.md`). Viewers will also see future dashboards and stats.
- **Tested:**
  - 15 privacy checks on a throwaway database.
  - Live checks that requests with no link, or a made-up one, return nothing.
  - A temporary test link on your real library (deleted afterwards): the library, a book page with a keepsake note (not shown) and "Does she own it?", at phone width in light and dark mode.

## 2026-10-27 · Merging, series check, print formats, author-series sort

- **Author sort keeps series together.** "Author A–Z, series in order" shows each author's series in reading order (series A–Z), then their books that aren't in a series. Ilona Andrews: Hidden Legacy 1–6, Kate Daniels 1–10, … Books without a series number go at the end of their series.
- **Merge duplicates.** On a book page: "Same book entered twice? Merge it into this one". Find the other entry, check, merge.
  - Its copies, credits, genres, tags, rating and details move over.
  - The kept entry's values win where both have one, and a field you cleared stays empty.
  - Read in either means read.
  - Each detail keeps its true source.
- **Possible duplicates** page: same title (bracketed notes like "(Hathaways)" ignored) and a shared author. It found one: Love in the Afternoon. Tap **Keep this one** on the entry to keep.
- **Series check** page:
  - 135 books by authors with series that aren't in a series, grouped by author. The series is pre-picked when the title names it, e.g. "Married By Morning (Hathaways)", with an option to tidy the title too.
  - The 69 series books with no number.
  - **Not in a series** confirms a standalone.

  Saved books leave the list.
- **Print formats** page: every print copy grouped by type, with covers; change one and it moves to the right group.
- **Fill in details:**
  - A **Test Google Books** button shows Google's actual answer.
  - Google errors now appear instead of being skipped silently. The first run found nothing from Google.
  - A new choice to re-check only the books still missing a description.
- The tools are grouped under **Tools** at the bottom of the library.
- **Tested:** 15 new database checks (merging and series), all earlier tests still pass, and a phone-width check in light and dark mode.

## 2026-10-29 · Phase 2, step 3: Fill in details from Open Library

- **Fill in details** (link at the bottom of your library) looks up each book on Open Library by title and author and fills in:
  - the description
  - the first published year
  - a typical length ("Typically 384 pages")
  - a word estimate for print and ebook copies
  - a series, only where the book has none (with your existing spelling of the series name)

  Copies with an ISBN also get their own publisher and page count.
- **Careful by design:**
  - A book is filled only when the title *and* an author surname match; otherwise it's skipped, not guessed.
  - Only empty fields are filled. Anything you set or cleared is never touched.
  - Everything arrives **unconfirmed**, and the book page says where it came from ("Open Library, not confirmed").
- **The run:** about 2 seconds a book. A progress bar, **Pause** and **Carry on**, even another day: books already checked are skipped. Each book shows what it got, or "No sure match. Skipped". You can check the already-checked books again later.
- **Google Books:** turns on automatically once you add the free key. It fills only what Open Library didn't have, and is credited as Google Books.
- **Book page:** shows "First published · Typically N pages" and the description, each with its source. Copy details from a lookup say "(Open Library, not confirmed)".
- **Tested:**
  - 9 database checks on the fill rules (never overwrite yours, unconfirmed, private).
  - A full run on six of your real books against live Open Library: 4 matched. Your own note on Devil in Winter stayed. Mars Vol. 4 and Dating & Dismemberment were skipped as uncertain.
  - A phone-width check in light and dark mode.

## 2026-10-29 · Phase 2, step 2: Classification on the book page

- **Classification** section on every book page. It shows audience, genre, subgenres and their deeper levels, tropes, subjects, vibe, romantic subplot, spice, story focus, reasons for reading, and the graphic-novel fields. Values from the shelf photos have a dashed outline until you confirm them.
- **Edit classification** opens one editor for everything:
  - Pick genres, and each genre's subgenres appear under it. Retelling sits under "Any genre".
  - Deeper levels appear as you go: Paranormal romance → **Supernatural beings** → Shifters → **Shifter type**; Queer romance → Sapphic / Achillean / Poly; Retelling → retelling type. Untick a level and everything under it goes too.
  - Tropes have a search box. Spice (with the Scoville Smut Scale descriptions) and story focus appear only for Romance or a romantic subplot. Choosing **Spice-led** ticks **Smut**; you can untick it.
  - **+ Add** in any group adds a new value to that list for all books.
  - **Save** confirms everything as set by you.
- **Your approved lists are loaded:** 200 values. The rough genres from the shelf photos are kept as "Rough genre". Clear-cut ones carried over as unconfirmed genres (249 links, e.g. Historical romance → Romance + Historical romance). A rough genre goes away once you set that book's genres.
- **Filters:** a group for every classification field, shown once at least one book uses it.
- **Spreadsheet download:** new columns for subgenres, tropes, audience, vibe, romantic subplot, spice, story focus, subjects, reasons and rough genre.
- **Tested:**
  - 13 database checks (lists loading, re-running safely, deeper levels, spice rules, privacy).
  - All earlier tests still pass.
  - The editor and filters at phone width in light and dark mode, using a copy of your real data.

## 2026-10-28 · Phase 2, step 1 done: starter lists approved

- You approved `docs/starter-lists.md` (rev. 3).
- **Smut** is a subgenre of Romance. **Romantasy** is called **Fantasy romance**.
- Some subgenres go deeper:
  - **Supernatural beings:** shifters, vampires, fae, witches/wizards/warlocks, deities, demons, ghosts and angels.
  - **Shifter type:** dragons, wolves, bears, big cats, various real animals and various mythological animals.
  - **Queer romance type:** Sapphic, Achillean and Poly.
  - **Retelling type:** Greek/Roman myths, Celtic/Norse myths, Grimm's fairy tales, other fairy tales & folklore, and classic literature.
- **Audience** (Adult / Young adult / Middle grade / Children's) is a new field, separate from genre.
- Lists grow as you categorize. The build plan (rev. 5) and the Phase 2 plan are updated to match.

## 2026-10-28 · Phase 2 plan approved; step 1 starter lists drafted

- Phase 2 (Enrichment) approved with your answers:
  - Claude API with a $60 first-month limit, then $10/month
  - Opus 5.5
  - author lookups as you go
  - a free Google Books key

  See `docs/phase-2-plan.md`.
- **Starter lists** drafted for your approval in `docs/starter-lists.md`: genres, subgenres, tropes, nonfiction types and subjects, reasons for reading, and graphic-novel lists. It also shows how your current rough genres from the shelf photos would change. No code yet.

## 2026-10-28 · Phase 1b, step 6: Wrap-up. Phase 1b is complete

- **Build plan updated** (`docs/build-plan.md`, rev. 3):
  - all four rating scales with your labels and descriptions
  - the Gone list and "Added by mistake"
  - editing, covers and adding books
  - a Phase 1b line in the build phases
  - open items brought up to date: manga runs split, digital books imported, 4 "needs checking" titles left
- **Grid tweak:** on the cover grid, the star rating now has its own line, so the label isn't cut off on your phone (e.g. "★ 4.50 Adored it").
- **Final checks:**
  - All the throwaway-database tests pass: add a book, edit details, Gone list, rating rules, saving ratings, quick edits.
  - The spreadsheet download, run on a copy of your real data: 1,068 books, 1,111 copies, your 6 ratings with labels.
  - Live database: every table is private (Row Level Security on), there's 1 login, and no books are left without a copy.
  - Phone-width check of the library, filters and sorts in light and dark mode, using a copy of your real data.

## 2026-10-28 · Phase 1b, step 5: Your rating scales

Your four scales from rating-scales.xlsx replace the old single star scale. You set them in the **Update** section of a book page, or the ✎ pop-up in your library.

- **Stars** (1.00–5.00): tap 1–5 stars, and the book gets that whole star. That star's quarters then appear underneath, each with its label and description (e.g. 3.00 Liked it, 3.25 Enjoyed it, 3.50 Really enjoyed it, 3.75 Almost loved it). Tap one to choose it. No slider. **Clear** removes the rating.
- **Writing quality** (optional, one tap): 1 Yikes, 2 Rough, 3 Fine, 4 Strong, 5 Masterful.
- **Would I recommend it?** (optional): No, Yes to everyone, or Yes to specific people.
  - These two appear once a book has stars. Clearing the stars clears them too.
  - Tap the chosen answer again to clear it.
- **Audio performance** (optional): shown only on audiobook copies, 1 Unlistenable → 5 Elevated the book, with a **Narration note**.
- **Where they show:** the label sits beside the stars everywhere (e.g. "★ 3.50 Really enjoyed it"). The book page shows each rating with its description.
- **Filters:** new groups for Stars (by whole star, or Not rated), Writing quality, Would I recommend it? and Audio performance.
- **Sorts:** Stars, Writing quality, Recommendation and Audio performance, highest first. Unrated books come last.
- **Spreadsheet download:** new columns for Stars, Stars label, Writing quality, Recommend, Audio performance and Narration note.
- The free-text "who I'd recommend it to" field is gone; the recommendation replaces it. Your 2 existing ratings (4.25 and 5.00) carry over unchanged.
- **Tested:**
  - 12 database checks (allowed values, stars needed for the extras, audio only on audiobooks, privacy).
  - 8 checks of the save logic.
  - A phone-width check in light and dark mode.

## 2026-10-27 · Phase 1b, step 4: Remove a copy, and the Gone list

- **Remove this copy** on every copy card of a book page gives two choices:
  - **I no longer own it:** tap Sold, Donated, Gave away, Lost or Other. The copy moves to your **Gone list**, with the date. Nothing is deleted.
  - **It was added by mistake:** for a copy you never had. After a "Delete it for good?" check, it's deleted, along with its cover photo. If it was the book's only copy, the whole book is deleted and you go back to your library.
- **A book with no copies left** drops out of your library, the "Do I own it?" lookup, Check covers and (later) stats. Its page still opens and says it's on your Gone list.
- **Undo:** each gone copy has an Undo button, on the book page (a new "Gone" section) and on the **Gone list** page (link at the bottom of your library).
- Adding a book you used to own says "On your Gone list" and adds it as a copy, so the book comes back with all its details.
- The spreadsheet download has a new **Gone** column (e.g. "Donated 2026-10-27").
- Tested against a throwaway database (10 checks: delete rules, privacy, last-copy handling), plus a phone-width check in light and dark.

## 2026-10-27 · Scan to add, and Add another / Finish

- **Scan the barcode:** the big button at the top of + Add opens your phone's back camera. Line up the barcode on the back of the book; when it reads the ISBN, the phone buzzes and Open Library is searched for that exact edition. It uses Chrome's built-in barcode reader, with the ZXing library as a backup in other browsers. Non-book barcodes and a blocked camera each get a clear message.
- **Or search by title, author or ISBN** in the box below it, as before.
- **After saving**, you stay on the Add page and choose:
  - **Add another book** (or **Add another copy**): opens a fresh, empty search.
  - **Finish**: back to your library (or **Back to the book** when adding a copy).
  - **Open its page**: to edit anything else.
- Going back no longer reopens a finished search. The duplicate check refreshes after each save, so adding the same book twice is still caught.

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
