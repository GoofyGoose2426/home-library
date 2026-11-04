# Phase 2, step 7 plan: Add a book, smarter

Approved by Alexandra · 2026-11-04 (kept values count as confirmed; include the barcode-from-photo button).

## What changes for you

Today, after you scan or pick a search result, the form only knows the title, authors and cover. Publisher and pages come through only when you scanned the ISBN. Description, year, length and series get filled in later, by the Fill in run.

After this step, the moment you pick a book the app looks it up on **Open Library and Google Books** (both free) and fills the form for you:

- **Series and number** (using your spelling if you already have the series, e.g. "Immortals After Dark")
- **Description**, **year first published** and **typical length**
- **Publisher** and **pages** for your copy (from the ISBN, when there is one)
- An **estimated word count** for your copy

Each filled-in value has a small label saying where it came from ("from Open Library") and a ✕ to clear it. Change or clear anything before you tap **Add to my library**. It takes a few seconds; you can start choosing format and read status while it looks.

This works the same for **Add a copy** (publisher and pages from the new copy's ISBN) and for **Enter it yourself** (a "Look it up" button once you've typed a title and author).

## Smaller fixes in the same step

1. **No more duplicate authors.** Adding a book will treat "T. J. Klune", "TJ Klune" and "tj klune" as the same person, so the problem we merged by hand can't come back. It also checks before saving, and if there's a near-match it shows it: "You have **TJ Klune**. Use that name?"
2. **"You already have this copy."** If you scan an ISBN that's already one of your copies, it says so straight away, before you fill anything in.
3. **New books waiting for Claude.** Genre, tropes, spice and the rest still come from Claude in our sessions (no in-app AI, as you chose). A new **"Not classified yet"** filter lists books with no Claude suggestions, so in a session you can just say "classify my new books" and I'll pick them up. The same goes for looking up a new book's author.

## What it won't do

- No AI inside the app (no cost, no API key). Classification for new books stays a session job.
- No reading a book from a photo of its cover. That needs AI. Scanning or typing the ISBN or title still works.

## Steps

| # | Step | What you'll check |
|---|---|---|
| 1 | Database: match authors ignoring spaces, dots and capitals, in both "add a book" and "edit details". Tests that "T. J. Klune" finds "TJ Klune" and that nothing else changes. | — |
| 2 | Look-up in the add form: details arrive with their source labels; clear or change any of them; the same for Add a copy and Enter it yourself. Already-owned ISBN warning. Author near-match prompt. | Add a real new book end to end |
| 3 | "Not classified yet" filter. | Filter shows your new book |
| 4 | Test at phone size in light and dark mode, publish, and note it in the changelog. | Add one more book on your phone |

## Cost

$0. Open Library and Google Books are free, and you already have the Google Books key.

## Questions for you

1. **When you keep a filled-in value and save, should it count as checked?** I suggest **yes**: you've seen it in the form, so it's saved as confirmed, with its source (for example "Open Library") kept beside it. It won't show up again in To check. The alternative is to save everything as unconfirmed, so you'd check it a second time in To check.
2. **Barcode from a photo?** The build plan mentions uploading a photo of a barcode, as well as scanning it live. I can add a "Use a photo instead" button next to Scan, for when the camera won't focus. It's small. Include it?
