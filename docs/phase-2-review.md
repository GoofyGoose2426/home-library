# Phase 2 review (step 8 wrap-up)

2026-11-04. Phase 2 (Enrichment) is built and live at **home-library-mocha.vercel.app**.

## The Phase 2 plan, item by item

| # | Step | Status | How it was checked |
|---|---|---|---|
| 1 | Starter lists | ✅ Done | You edited and approved `docs/starter-lists.md` (2026-10-28) |
| 2 | Edit classification on the book page | ✅ Done | You classified books by hand; every field shows its source and is a filter |
| 3 | Fill in from Open Library and Google Books | ✅ Done | Run on the whole library; 748 books now have a description, with publisher, length and series where found |
| 4 | To check | ✅ Done | You cleared the publisher suggestions and reviewed the rest (2026-10-30, again 2026-11-04) |
| 5 | Claude classification in sessions | ✅ Done | 1,054 of your 1,069 owned books have a genre. 11 are Reference. 7 are left (below) |
| 6 | Author pages and representation | ✅ Done | All 380 authors of books you've read looked up: 77 identity values, each with a link and the author's own words; 26 character values; 6 own-voices books. You checked the first batch and gave notes |
| 7 | Add a book, smarter | ✅ Done | You added a real book on your phone (2026-11-04) |
| 8 | Wrap-up | ✅ Done | This review |

## Checks run for the wrap-up

- **Practice database:** a brand-new, throwaway database built on my computer from all 17 database changes, so your real library wasn't touched. All 34 automated checks pass (`scripts/db-tests/`):
  - every table is locked to your account
  - logged-out visitors and any other account see nothing and can't change anything
  - the view-only link shows your owned books and authors, hides loans, keepsake notes and the Gone list, and can't change anything; a wrong or turned-off link sees nothing
  - Fill in never replaces a value you set or confirmed, but still fills empty ones
  - "T. J. Klune" and "TJ Klune" are one person
- **Your real library (read-only):**
  - every book has a copy, and no records are orphaned
  - there are no duplicate authors
  - the only same-title pairs are the two different books from Phase 1
- **Code:** builds cleanly, with no type or lint errors.
  - `npm audit` reports one moderate warning, in the code-checking tool (ESLint). That tool runs only on my computer and isn't part of the app. The suggested "fix" is an older version, so I've left it.
- **Supabase security advisor:**
  - "Leaked password protection" is a paid-plan feature, as in Phase 1.
  - "`shared_owner()` can be run by visitors" is expected: it's how the view-only link checks its key. It only ever answers "this key opens this library" or "it doesn't".

## Claude cost vs the estimate

| | Estimate (in-app Claude API) | Actual |
|---|---|---|
| Classify the whole library | $20–40 once | **$0** |
| Author lookups | ~$1–3/month as you go | **$0** |
| New books | ~$2–5/month | **$0** |

The work ran in Claude Code sessions under your existing Claude plan ("Option A"), at no extra cost. That covered about 1,060 books classified and 380 authors looked up. If you later want one-tap suggestions or Ask your library inside the app, the estimates in `docs/phase-2-plan.md` still apply. I'll redo them with Phase 3.

## Classified today

The last 28 books with no genre now have Claude suggestions waiting in **To check**. Most were books the first pass couldn't identify; a web search found them (*Drag Me Up* turned up during the screen tour, from its cover). 6 are left, because I couldn't classify them honestly:

- *Old Turtle*, *Old Turtle: Questions of the Heart*, *The Giving Tree*, *Guess How Much I Love You* (fable-style picture books that don't fit a genre on your list)
- *Coat of Many Colors* (the song as a picture book)
- *The Goat in the Bedroom* (Amy Award): I couldn't find it online. Worth checking the title and author.

The "Not classified yet" filter finds them. Picture books stay out of stats either way.

## Screens

Toured live, signed in, at phone size (390px) in light and dark mode (2026-11-04):
- library
- filters, including "Not classified yet" (6 books)
- a book page (classification and representation)
- an author page (TJ Klune, with quotes and links)
- To check
- Fill in
- Add a book

Everything lays out and reads well in both modes. Three notes were out of date and are fixed:
- The book page said dashed values "came from your shelf photos". It now says when they're Claude's suggestions.
- The book page and Do I own it? both said later series volumes would appear "after Phase 2". Phase 2 didn't add that, because Open Library doesn't say how many books a series has. The notes are reworded, and it's on the open list.

## Worth knowing

1. **Leftover author removed:** "Fitzpatrick", from the first import, had no books. Deleted with your OK.
2. **3 books are still flagged Needs review** from the shelf photos.
3. **Supabase access token** (what lets me run the session scripts) expires around 22 November. I'll walk you through renewing it.
4. **The view-only link's secret on my computer doesn't match the one in Vercel.** Nothing is broken: your link works and is safe. It only means I can't open your shared view from here, which is fine.
5. **Still in To check:** most of the author identity (66) and character (20) values from the lookups aren't confirmed yet. Confirm them whenever you like.
