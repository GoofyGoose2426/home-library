# Phase 4 plan: Keeping it up to date

Draft 2026-11-13, waiting for Alexandra's OK.

Phases 1–3 built the library. Phase 4 keeps it current with as little effort as possible. **Nothing here is required**, it all costs $0, and you choose which steps to do. Each step is small and stands on its own, so we can do one, use it for a while, and come back for the next.

The build plan named two things for this phase: digital library imports, and ISBNs and exact editions a shelf at a time. Doing Phase 3 turned up three more worth offering: rating the books you've read, the authors of your unread books, and a free question box in the app.

## Where things stand

- **ISBNs:** 567 of 580 print copies, all 511 Kobo copies and all 8 Audible copies have none. Libro.fm's 31 have theirs. Without one, a copy shows a best-guess cover and no exact page count or publisher.
- **Stars:** 737 of the 758 books you've read have no star rating yet, so star stats and "average rating" answers are thin.
- **Author identity:** unknown for about 96% of books, because only the authors of books you've read were looked up (and most haven't said publicly).
- **Genre:** 18 books counted in stats have none yet.

## Steps (pick any)

| # | Step | What it does | What you'd check |
|---|---|---|---|
| 1 | **Scan a shelf** | A new page for adding ISBNs fast. Stand at a shelf and scan barcodes one after another with your phone. For each one the app finds the copy you already own (by title and author), and fills in the ISBN, exact cover, publisher and page count. Anything it isn't sure of goes in a short "check these" list instead of being saved. Your own edits are never overwritten. No re-typing, and books without a barcode are simply skipped. | Scan one shelf |
| 2 | **Rate what you've read** | A quick-rating screen: one read book at a time with its cover, tap the stars (your quarter-star scale), or **Skip**. It remembers where you stopped. Sorted the way you like (by author, recently added, or random). | Rate 20 books in a few minutes |
| 3 | **New digital books** | For ebooks and audiobooks you buy from now on. Kobo, Audible and Libro.fm don't offer a simple export, so the reliable way is the one that worked for the original import: send me screenshots of your app library in a session. I bring in only the new books, match them to titles you own (one entry per title), and show you anything uncertain before saving. Nothing to build; this is just how we'll do it. | Next time you've bought a few |
| 4 | **Authors of your unread books** | I look up the authors of your unread books in our sessions, the same way as Phase 2: only their own public words, with a source link, otherwise Unknown. They arrive unconfirmed in **To check**. This would make the author identity stats meaningful. | Review them in To check |
| 5 | **Question builder in the app (free, no AI)** | A box on the Stats page where you build a question by tapping (which books → count / group by / average / list), using the same read-only lookups as Ask your library. Answers on your phone any time, with Pin to dashboard. Typing questions in your own words still happens in our sessions. | Build and pin one question |
| 6 | **Tidy-ups** | Classify the 18 books with no genre, in a session, as unconfirmed suggestions for To check. | Review them in To check |

**My suggestion:** start with **1 (Scan a shelf)** and **2 (Rate what you've read)**. They're the two that save you the most effort and fill the biggest gaps in your stats. Do 3 whenever you've bought new digital books. Add 4–6 if and when you want them.

## Costs and database

- Everything is $0: Open Library and Google Books are free, and steps 3, 4 and 6 happen in our sessions under your existing Claude plan.
- Steps 1, 2 and 5 need no database changes; copies already have room for an ISBN, edition, publisher and pages. If that changes, I'll write a migration and ask before applying it, as usual.
- Same rules as always: your edits win, uncertain matches go to a review list, nothing is guessed about authors, and the view-only link never gets anything new it shouldn't see.

## Questions for you

1. **Which steps do you want**, and in what order?
2. **Scan a shelf:** when a scanned book is a *different edition* from the one you own on record (say, the app has a paperback, but the barcode is a hardcover), should it update the existing copy, or ask you each time? I suggest **ask each time**: it's rare, and it might be a second copy.
3. **Rate what you've read:** should it also offer writing quality and "would I recommend it?" on the same screen, or stars only to keep it fast? I suggest **stars only**, with a link to the full review.
