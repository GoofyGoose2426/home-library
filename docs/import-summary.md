# Import summary (Phase 1, step 5)

What I read from your photos and screenshots on 2026-10-23. Nothing has been saved to the database yet: step 6 shows you the review list on your phone first.

## Your library at a glance

| | Count |
|---|---|
| **Titles** (one entry per book) | **1,069** |
| **Copies** (one per format you own) | **1,110** |
| Print copies | 560 |
| Ebooks (Kobo) | 375 |
| Audiobooks (Kobo 136, Libro.fm 31, Audible 8) | 175 |
| Titles you own in more than one format | 35 |
| Read / Unread | 727 / 342 |
| Left out of stats (art, craft, colouring, picture books, reference) | 32 |
| **Items for you to check** | **53** |

## What changed from the earlier list of 428 print books

- **About 90 print books weren't in the earlier list.** Most are on the white bookcase in your Read photos: Talia Hibbert, Helen Hoang, Abby Jimenez, Alisha Rai, Hannah Grace, Elle Kennedy, Mariana Zapata, TJ Klune's Green Creek and Cerulean Sea books, Rebecca Ross, Everina Maxwell, the Villain books, FAKE Vols. 1–7, Tale of the Waning Moon Vols. 1–4, Until the Full Moon Vols. 1–2, the Nora Roberts Irish trilogy, Anne Rice's Sleeping Beauty trilogy and more.
- **Manga runs are now one title per volume:** Bastard!! (10), Mars (15) and Ouran High School Host Club (18).
- **Fixed from the photos:**
  - "We Hexed the Moon" is a novel by Mollyhall Seeley, not the Mallory O'Meara nonfiction book.
  - "Burn" is by TJ Klune.
  - The "Fitzpatrick title" is "Meditations for Makers".
  - The "Tarot graphic novel" is "Taproot" by Keezy Young.
  - The "Sara Douglass title" is "The Wayfarer Redemption".
  - "another Roald Dahl" is "James and the Giant Peach".
  - The "Jacob Two-Two book" is "Jacob Two-Two's First Spy Case".
  - The "second Amanda Lovelace" is "Shine Your Icy Crown".
  - "The Love Letters of…" is "…of a Portuguese Nun".
  - "The Raven and Other…" is "…Favorite Poems" (Poe).
  - "Maiden, Mother, Crone" is Gwen Benaway's anthology.
  - The "Janell Cannon picture book" is "Trupp: A Fuzzhead Tale".
- **Two extra print copies** sit inside existing titles: the Penguin Clothbound "Pride and Prejudice", and a second "Guess How Much I Love You".
- **"The Uncommon Reader"** is on the black bookcase's top shelf (Read photos), not the nonfiction shelf.

## How formats were matched

An ebook or audiobook joins an existing title when the title and author both match. Same-titled books by different authors stay separate. For example, Hannah Grace's and Ilona Andrews' "Wildfire" are two titles, and so are Emily Nagoski's and Jess K. Hardy's "Come As You Are". Box sets and omnibus editions (e.g. "Bridgerton Collection Volume 1") are their own titles for now. Splitting them into the books they contain can come later.

## Read status rules

- **Print:** the Read or Unread folder.
- **Kobo:** Finished = Read.
- **Audible:** only "Finished" = Read, as you asked.
- **Libro.fm:** you decide.
- **Several formats:** if any copy is finished, the title is Read.

## What's on your review list (step 6)

- **30 Libro.fm audiobooks** to tick Read or Unread. A Libro.fm book you already finished in another format, like "A Witch's Guide to Magical Innkeeping", is already counted as Read.
- **21 uncertain titles or authors.** These include the half-hidden or blurry spines: the second Kristen Britain behind Winterlight, the two Amanda Quick spines, the far-left Kleypas, the "Pro…" book behind the Bromance series, "The Companion", "Who Was Betty?", "Chaos…", "The Darkness…", "Familiars", the Law Cooper book and the thin picture books. Also: **Mars Vol. 3** isn't visible on the shelf.
- **2 read-status questions:**
  - "Burnout": the print copy is in your Unread photos, but you finished the audiobook.
  - "How My Neighbor Stole Christmas": in progress on Audible.
- **1 possible duplicate:** the earlier list had both a "Janell Cannon picture book" and a "Trupp picture book", and the photo shows just one.

Every new print book is "print, type unknown" until you set hardcover, trade or mass-market (step 11).

## Files

- `data/import/raw/`: my transcription of every photo, screenshot and the Libro.fm file, with notes.
- `data/import/plan.json`: the 1,069 titles and their copies, ready to import.
- `data/import/review.json`: the 53 items for your review screen.
- `scripts/import/build_plan.py`: rebuilds both files. Safe to re-run.
