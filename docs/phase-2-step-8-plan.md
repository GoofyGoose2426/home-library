# Phase 2, step 8 plan: Wrap-up

Approved by Alexandra · 2026-11-04 (include classifying the "Not classified yet" books).

Step 8 closes Phase 2 (Enrichment). Nothing new gets built; this step checks that everything from steps 1–7 holds together, writes it down, and shows it to you.

## What I'll do

| # | Step | What you'll check |
|---|---|---|
| 1 | **Update the build plan** (`docs/build-plan.md`). Mark Phase 2 done. Record what changed from the original plan: no AI inside the app (your "Option A"), classification and author lookups done in our sessions instead, and suggestions stored with each value's source rather than in a separate suggestions table. Tick off the open items that are done (starter lists approved) and add the ones still open (see below). | Read the updated "Build phases" and "Open items" sections |
| 2 | **Test on a throwaway database.** Build a brand-new practice database on my computer from all 17 database changes, then run every automated check against it: only your account can change anything, logged-out visitors see nothing, the view-only link hides loans, keepsake notes and the Gone list and can't edit, your edits are never overwritten by a later fill-in, and adding a book doesn't create duplicate authors. Your real library isn't touched. | — |
| 3 | **Health check on the real library**, read-only: no books without a copy, no duplicate authors, no orphaned records, how many suggestions are still waiting in To check. Plus code checks (builds cleanly, no type or lint errors, no known security issues in the add-ons) and Supabase's security advisor. | — |
| 4 | **Claude spend vs the estimate.** The plan estimated $20–40 once, then $2–5 a month, for the in-app Claude API. Actual: **$0**, because you chose to have me do it in sessions under your existing Claude plan. I'll write down what that covered (about 1,030 books classified, 380 read authors looked up) and what the in-app version would still cost if you ever want it. | — |
| 5 | **Demo.** A short review page (`docs/phase-2-review.md`, like the Phase 1 one) with each step, its status and how it was checked. I'll go through every Phase 2 screen at phone size in light and dark mode: book page classification and representation, To check, author pages, the new filters, Fill in, Add a book, and the view-only link. Anything small I find, I fix then and there; anything bigger goes on the list for you to decide. | Final run-through on your phone |
| 6 | **Changelog and publish.** | — |

## Left open after Phase 2 (for you to decide later)

- **Authors of unread books**: looked up only when you ask.
- **New books that aren't classified yet** (the "Not classified yet" filter; 34 before the book you just added).
- **Supabase access token** runs out around 22 November. I'll walk you through renewing it.
- **In-app Claude** (one-tap suggestions, Ask your library): Phase 3, with its own cost estimate first.

## Cost

$0. The practice database runs on my computer, not as a paid Supabase extra.

## One question for you

**Should I classify the "Not classified yet" books as part of the wrap-up,** so Phase 2 ends with the whole library done? It's about 35 books, in one session batch, arriving in To check as usual. Or leave them for later.
