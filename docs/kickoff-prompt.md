# Kickoff prompt

Paste this into Claude Code as your first message, from inside the `home-library` folder. Use plan mode for this first message: press Shift+Tab until it shows "plan mode".

---

I want to build my private home library catalog. Everything you need is in this folder:

- `CLAUDE.md`: the stack, rules and how I'd like you to work
- `docs/build-plan.md`: the full product spec
- `data/seed-books.json`: the 428 print books already catalogued from my shelf photos
- `Books/`: my photos and screenshots of my whole library (print books split into Read and Unread folders; ebook and audiobook screenshots show read status). These are the source for the full import.

I'm not a developer, so walk me through anything I need to do myself (accounts, keys, commands) step by step.

Please:

1. Read all three files.
2. Ask me any questions you need answered before you start. Ask them one at a time.
3. Confirm the stack with me, including which accounts I need to create (Supabase, Vercel, Anthropic API, GitHub) and what each will cost me per month at my scale (one user, ~500–1,000 books).
4. Propose the database schema for the whole plan (titles, copies, series, collections and pieces, authors and contributors, representation with sources, taxonomy for genres/subgenres/tropes/vibes, reviews, loans, saved reports). Show it as a simple diagram and explain it in plain language.
5. Then plan **Phase 1 only** (Foundation): private login, database, seed import, cover grid and table views, sort and filter, bookstore lookup, quick edits and loans. Break it into small steps I can check as we go.

Don't write any code until I've approved the schema and the Phase 1 plan.

---

## Later phases

Start each phase with a message like:

> Phase 1 is done and working. Let's plan Phase 2 (Enrichment) from `docs/build-plan.md`. Start by drafting the starter subgenre and trope lists for my approval, using the books in my catalog as examples.

> Let's plan Phase 3 (Reviews and stats). Start with the review form on my phone, then the read/unread dashboard, then Ask your library.

> Here are my Kobo/Audible/Libro.fm exports (attached). Add them as ebook/audiobook copies, matching to existing titles where I already own the book, and show me any matches you're unsure about before saving.
