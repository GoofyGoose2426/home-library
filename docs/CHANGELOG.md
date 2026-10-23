# Changelog

What's been built, in plain language. Newest first.

## 2026-10-23 · Phase 1, step 6: Import review and save

- A "Check your import" screen for the 53 uncertain items. Choices save as you go.
- You decided all 53 and saved: **1,059 books and 1,100 copies** are now in your library (733 read, 326 unread), with 607 people, 193 series and rough genres from the shelf photos.
- 10 uncertain books were left out, including Mars Vol. 3. 11 are kept with a "check later" flag. Libro.fm: 15 read, 15 unread. "Burnout" is Read. The Janell Cannon picture book is one book.
- Saving is protected: an interrupted save resumes without duplicates, and a finished import can't run again and bring back books you've removed.

## 2026-10-23 · Phase 1, step 5: Reading your photos

- Read all 36 shelf photos, 32 Kobo ebook screenshots, 14 audiobook screenshots and the Libro.fm list. Your originals in `Books/` were only read, never changed.
- Found 1,069 titles and 1,110 copies (560 print, 375 ebooks, 175 audiobooks), including about 90 print books the earlier list missed.
- Split the manga runs into single volumes, fixed a dozen uncertain titles from the photos, and matched ebooks and audiobooks to print books you already own (35 titles in more than one format).
- 53 items are waiting for your review in step 6. Nothing is in the database yet. Details: `docs/import-summary.md`.

## 2026-10-23 · Phase 1, step 4: Login

- Real sign-in with email and password. Only actheroux@live.ca can get in, and there's exactly one account in Supabase.
- "Forgot your password?" emails a link to a "Choose a new password" page. Passwords need at least 10 characters. The email itself is Supabase's standard one; the free plan doesn't allow changing its wording.
- A Sign out button, and the sign-in page skips straight to your library when you're already signed in.
- Tested by you on your phone and laptop: sign-in works, a wrong password is refused, and sign out works.
- Dark-mode buttons now use dark text so they're easy to read.

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
