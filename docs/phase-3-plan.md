# Phase 3 plan: Reviews and stats

Approved 2026-11-10 with option **A** (Ask your library in our sessions, free). Partly read shows as its own slice; reviews show on the view-only link.

Already built before step 1, at Alexandra's request: a series list, Add series, and a series page with Add book to series (see the changelog, 2026-11-10). The overall series review (stars, writing, recommend, notes) was added on 2026-11-10 too, so step 3 now only needs the collection and per-story reviews.

**Progress:** step 1 (mood list) approved 2026-11-10; step 2 (review a book) built and live 2026-11-10, waiting for Alexandra to review three books. The mood-list database check (migration 20261110100000) was applied with her OK.

Phase 3 adds the two things the catalog doesn't do yet: **writing about what you've read**, and **seeing your library as a whole** (charts, and answers to questions). Everything follows the build plan's rules. Stats cover owned books only, and leave out the excluded category (colouring, art/craft reference, picture books, reference books such as cookbooks). Ask your library can only read your data, never change it. The view-only link sees the dashboard and reviews, but never loans, keepsake notes or the Gone list.

The database is already ready for most of this. The reviews table has a place for the review text, "broke my brain", mood reactions, would re-read, favourite quote and confirmed spice. The saved-reports table is waiting for pinned answers.

## Steps (each ends with something you can check)

| # | Step | What you'll check |
|---|---|---|
| 1 | **Mood reactions list, no code.** I draft the list (funny, cried, page-turner, cozy, angry, swoony, scared…) in `docs/starter-lists.md`, from your own wording where I can find it. You edit and approve it, as you did the genre lists. | Approve the list |
| 2 | **Review a book.** A Review section on the book page: your free-text review; broke my brain / challenged my worldview; mood reactions (tap any); would re-read; favourite quote; and **confirmed spice** (the Scoville Smut Scale, for Romance or a romantic subplot), which replaces the suggested spice once set. The stars, writing quality and recommendation stay where they are, next to it. Quick edit gets a "Write a review" shortcut. All new fields become filters. | Review three books you've read |
| 3 | **Series and collection reviews.** On the series page (already built): an overall series review beside each book's own. For anthologies and collections: an overall review, plus an optional short review for each story or essay. | Review one series and one collection |
| 4 | **Read vs. unread dashboard** (new **Stats** page, in the menu). The read / partly read / unread split, as colourful charts in the app's palette. Pick any field to break either side down: "of my unread books, 35% are horror", or read vs. unread by genre, format, author identity, decade, stars, spice and more. Tap a slice to open those books in the library. | Look through it on your phone and computer |
| 5 | **Ask your library.** A question box on the Stats page. The answer comes back as a chart, a table or a sentence, with a **Pin to dashboard** button. How the question gets answered depends on your choice below. Either way, it uses a fixed set of read-only questions the app knows how to ask (filter, group by, count, average, list). It never writes its own database queries, and it never changes anything. | Ask five questions; pin two |
| 6 | **Wrap-up:** update `docs/build-plan.md`, run the throwaway-database tests (new privacy checks for reviews and reports, including the view-only link), compare cost with the estimate, and demo at phone and desktop size in light and dark mode. | Final run-through |

Steps 2–4 cost nothing. Only step 5 can cost money, depending on the option you choose.

## Ask your library: three options

The app works out the answer from your data at no cost. The Claude part only turns your question into the right read-only lookup, and then words the answer. **A pinned answer redraws for free every time you open the dashboard**, because it saves the lookup itself, not the AI's reply.

| | **A. In our sessions** | **B. In the app, Claude Opus 5.5** | **C. In the app, Claude Sonnet 5.5** |
|---|---|---|---|
| How you ask | Ask me in a Claude Code session. I run the read-only lookup and pin the answer to your dashboard | Type into the question box, any time, on your phone | Same as B |
| Answer quality | Best (it's me, with full context) | Best of the in-app options. Handles tricky questions ("compare author demographics between read and unread") | Very good. Occasionally needs a question rephrased |
| Speed | When we're in a session | About 5–15 seconds | About 3–10 seconds |
| Cost per question | $0 (uses your existing Claude plan) | about **$0.10** | about **$0.05** |
| 30 questions a month | $0 | about **$3/month** | about **$1.50/month** |
| 100 questions a month | $0 | about **$10/month** | about **$5/month** |
| Setup | None | An Anthropic account with a payment card, an API key in Vercel (I'll walk you through it), and a monthly spending limit you choose | Same as B |

How I worked out the cost: Claude Opus 5.5 is $4 per million words-in ("tokens") and $20 per million out. Sonnet 5.5 is $2 and $10. A typical question takes about three back-and-forth steps (about 24,000 tokens in, most of them cached at a 95% discount, and 4,000 out). Unusual or long questions could cost two to three times that. The app would log every question's real cost, so you can see it.

**Safeguards for B or C:**
- the API key lives only on the server (Vercel), never on your phone or in GitHub;
- your spending limit in the Anthropic account is a hard stop;
- a monthly cap in the app as well, so it says "limit reached" instead of spending more;
- a running total on the Stats page.

**My suggestion:** start with **A**. It's free and needs no new account, and it builds everything the app needs for B or C anyway (the read-only lookups, charts and pinned reports). You can switch to B later in an afternoon if you find you want answers on your phone without opening a session. If you'd rather have the question box on your phone from day one, **B** is about the price of a coffee a month at normal use.

## Database changes

- Mood reactions checked against your approved list.
- Short reviews for individual stories and essays. The table already allows it; this needs only the screens.
- Saved reports: already in place. I'll add a check that a report can only hold a read-only lookup.
- For B or C only: an `ai_runs` log (question, model, tokens, cost), so the app can show real spend and enforce the monthly cap.
- Every new or changed table keeps the owner-only lock. The view-only link gets read access to reviews and the dashboard only.

## Also in this phase (small)

- Add **Recharts**, a free chart library, to draw the charts in the app's colours.
- **Supabase access token renewal** (it runs out around 22 November). I'll walk you through it at the start, so the session scripts keep working.

## Questions for you

1. **Ask your library: A, B or C?**
2. **Should "Partly read" count as read or unread in the dashboard's main split?** I suggest showing it as its own slice (read / partly read / unread), as the build plan says, and counting it as unread when you choose a two-way view.
3. **Should reviews show on the view-only link?** The sharing plan says the link shows everything except loans, keepsake notes and the Gone list, so I'd include your reviews. Tell me if you'd rather keep them private.
