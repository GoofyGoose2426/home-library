# Changelog

What's been built, in plain language. Newest first.

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
