# Phase 2 plan: Enrichment

Approved by Alexandra · 2026-10-28.

Phase 2 fills in what your books don't have yet: publisher and length, then genre, subgenre, tropes, vibe, spice and story focus, then author and character representation. Each filled-in value is a **suggestion** with its source ("Open Library", "Google Books", "Claude", or a web link). You check it before it counts. Your own edits always win and are never overwritten.

## Your decisions

| Question | Your answer |
|---|---|
| Use the Claude API? | **Not for now** (changed 2026-10-27, "Option A"). The catch-up is done by Claude Code in working sessions, covered by your existing Claude plan, at no extra cost. The in-app API (and its spending limits) waits until you want one-tap suggestions or Ask your library. |
| Which Claude model? | Opus 5.5, if and when the in-app API is added |
| Author representation | **As you go**, starting with authors of books you've read |
| Google Books key | **Yes** (free) |

You'll set up the Anthropic account before step 5 and the Google Books key before step 3. I'll walk you through each when we get there.

## Steps (each ends with something you can check)

| # | Step | What you'll check |
|---|---|---|
| 1 | **Starter lists**, no code. I draft genres, subgenres, tropes, nonfiction subjects, reasons for reading and graphic-novel lists (origin/style, manga demographic, universe) in `docs/starter-lists.md`, based on your library. You edit and approve them. Nothing is filled in until you do. | Approve the lists |
| 2 | **Edit classification on the book page**: genre(s), subgenre(s) with their deeper levels (supernatural beings, shifter type, queer romance type, retelling type), audience, tropes, vibe (main + second), romantic subplot, spice (Scoville Smut Scale), story focus, subjects, reasons for reading, graphic-novel fields. Spice-led books get the **Smut** subgenre under Romance. Every field shows its source, and all are new filters. | Classify three books by hand |
| 3 | **Fill in from Open Library and Google Books** (free): publisher, pages, publication year, description, series and number, and estimated word count. A button you start runs it for the whole library. Everything arrives unconfirmed and never replaces your values. | Run it; spot-check ten books |
| 4 | **"To check" screen**: suggestions grouped by book and by field, each with its source. Confirm, edit or reject one at a time, or **confirm all** for a field you trust (e.g. publisher). | Clear the publisher suggestions |
| 5 | **Claude suggestions for classification, done in Claude Code sessions** (Option A). Batches of books: Claude reads the title, author, description and your approved lists, and suggests genre, subgenres and their deeper levels, tropes, audience, vibe, romantic subplot, spice and story focus. Each value is saved as a "Claude" suggestion, unconfirmed, and appears in **To check**. Nothing you set is touched, and nothing you rejected comes back. A first batch of 25 books you know well, to judge quality, then the rest. | Judge the first 25 in To check |
| 6 | **Author pages and representation**: one page per author, listing their books. In Claude Code sessions, Claude searches the web for the author's **own** public statements about their identity (bio, interviews, own-voices notes). A value is saved only with the source link and the author's quote; anything else stays **unknown**. It never guesses from names, photos or nationality. **Character representation** is suggested only from publisher descriptions or community representation tags, with the source shown. The own-voices flag is set when the author and main character share an identity. | Look up three authors; check every quote and link |
| 7 | **Add a book, smarter**: after you pick a search result, publisher, length and Claude's classification arrive as suggestions in the form, for you to check before saving. | Add a new book end to end | (Without the in-app API, this step adds Open Library and Google Books details only; Claude classification for new books happens in a session, or by hand.)
| 8 | **Wrap-up**: update `docs/build-plan.md`, test against a throwaway database, compare the actual Claude spend with the estimate, and demo at phone size in light and dark mode. | Final run-through |

## Database changes

Most of the database is already in place (tags, author and character representation, sources). Additions:

- New list types for subjects, reasons for reading and the graphic-novel fields.
- `titles.description_source`, and a word-count estimate on copies.
- A `suggestions` table: each suggested value, its source and link, and whether you confirmed, edited or rejected it.
- An `ai_runs` log: what was asked, the model used, the tokens and the cost. This lets the app show real spend.

## Cost

**$0 extra for now** (Option A): the catch-up runs in Claude Code sessions under your existing Claude plan; it uses some of the plan's usage while it runs. Open Library and Google Books are free. If the in-app API is added later, the estimates below apply.

### If the in-app API is added later


Open Library and Google Books are free. The Claude API is the only cost, using Opus 5.5 prices ($4 per million tokens read, $20 per million written; half price for bulk runs, which return within a few hours).

| What | When | Estimated cost |
|---|---|---|
| Classify the whole library (~1,070 books, bulk run) | Once | **$20–40** |
| Look up authors as you go (~$0.15 each) | Ongoing | ~$1–3/month |
| Look up all ~550 authors (optional, later) | Once, if you choose | ~$80 |
| New books (10–20/month: classification + new authors) | Monthly | **~$2–5/month** |

**Safeguards:**
- Your monthly spending limit in the Anthropic account is a hard stop.
- The app shows an estimate before any bulk run and logs every call's real cost.
- The API key lives only in Vercel and `.env.local`, never in your browser or GitHub.
- Ask your library (Phase 3) will add its own small monthly cost. I'll estimate it then.
