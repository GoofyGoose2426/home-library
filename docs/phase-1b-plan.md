# Phase 1b plan: edit, add, remove, and the new rating scales

Draft for Alexandra's approval · 2026-10-26 · No code until approved.

Phase 1 left out four things you need now: editing a book's own details and cover, adding books, removing books you no longer own, and your new rating scales (`rating-scales.xlsx`, v2). The build plan puts adding books in Phase 2, cover uploads in Phase 4, and ratings in Phase 3. This brings the basic versions forward. Phase 2 still adds barcode scanning and AI fill-in on top.

## Your decisions

| Question | Your answer |
|---|---|
| Book you no longer own | Keep it in a **"Gone"** list (with how it left), out of your library, lookup and stats |
| Adding a book | **Look it up on Open Library, then you check** before saving; if you already own it, add a copy instead |
| Audio performance labels | Use the spreadsheet drafts as they are |

## Steps (each ends with something you can check)

| # | Step | What you'll check |
|---|---|---|
| 1 | **Edit details** on the book page: title, subtitle, authors and contributors with their role (author, writer, artist, editor, translator), series and number, book type. Narrators on each audiobook copy. Saving marks each value "Set by you" and can clear the "Needs checking" flag. | Fix the two Amanda Quick spines and "Who Was Betty?" |
| 2 | **Change a cover**, per copy: take or choose a photo on your phone (stored privately in your Supabase), pick from Open Library's covers for that book, or remove it. Your chosen cover replaces the best guess and is never overwritten. | Photograph a book and see it in the grid |
| 3 | **Add a book**: one **+ Add** button. Type a title, author or ISBN, pick the right result from Open Library, then check the pre-filled details. Choose format, where it lives, read status, rating, and "On loan to" if it's already lent out. If the title is already in your library, it's added as another copy of that book (one entry per title). Manual entry is there if nothing matches. | Add this weekend's books, and the ones you've lent out |
| 4 | **No longer own**: on any copy, choose **Sold / Donated / Gave away / Lost / Other**. The copy moves to **Gone**. When a book has no copies left, it leaves your library, the lookup and stats. A **Gone** page lists them, with an **Undo** button in case of mistakes. | Mark one book donated, find it under Gone, undo it |
| 5 | **New rating scales**, replacing the single star scale. Each one is filterable and sortable, and ready for Ask your library later. | Rate three books you've read |
|   | **Stars** (1.00–5.00, quarter steps): tap 1–5 stars, then choose between that star's quarters (e.g. 4.00 Loved it · 4.25 A great book · 4.50 Adored it · 4.75 Almost perfect), each with its description. No slider. The label shows next to the stars everywhere; the description shows in the picker and on the book page. | |
|   | **Writing quality** (optional, one tap, 1–5: Yikes → Masterful) | |
|   | **Would I recommend it?** (optional: No / Yes, to everyone / Yes, to specific people). This replaces the free-text "who I'd recommend it to" prompt. | |
|   | **Audio performance** on audiobook copies (optional, 1–5: Unlistenable → Elevated the book, plus a short note) | |
| 6 | **Update** `docs/build-plan.md` (rating scales, Gone list), test against a throwaway database, publish, demo at phone size in light and dark mode. | Final run-through |

## Database changes

- **`reviews`:** star rating limited to 1.00–5.00 in quarter steps; new `writing_quality` (1–5) and `recommendation` (no / everyone / specific). Copy reviews get `audio_performance` (1–5) and use the review text as the note. You have no ratings yet, so nothing needs converting.
- **`copies`:** `gone_at` and `gone_reason` (sold, donated, gave away, lost, other).
- **Covers you upload** go in the private `covers` folder already set up in step 3, viewable only when you're signed in.

## Cost

Still $0. Open Library is free, Supabase's free plan includes 1 GB of file storage (thousands of cover photos), and no AI is involved yet.
