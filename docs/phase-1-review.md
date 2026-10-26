# Phase 1 review (step 14 demo)

2026-10-26. Phase 1 (Foundation) is built, live at **home-library-mocha.vercel.app**, and installed on your Pixel.

## The Phase 1 plan, item by item

| # | Step | Status | How it was checked |
|---|---|---|---|
| 1 | Accounts | ✅ Done | GitHub, Supabase, Vercel set up; Node.js on the Mac |
| 2 | Empty app online | ✅ Done | Live on Vercel; every page except sign-in is locked |
| 3 | Database | ✅ Done | 15 tables, each locked to your account. Logged-out visitors are refused on every one; Supabase's advisor has one note (below) |
| 4 | Login | ✅ Done | One account (actheroux@live.ca), sign-ups off, password reset by email |
| 5 | Reading your photos | ✅ Done | 36 shelf photos, 46 app screenshots and the Libro.fm list read; originals untouched |
| 6 | Import review | ✅ Done | You decided all 53 items; 1,058 books and 1,099 copies saved |
| 7 | Best-guess covers | ✅ Done | Open Library covers found; you've since removed 187 that were wrong. 604 books have a cover |
| 8 | Cover grid and table | ✅ Done | Phone and desktop, light and dark, with your real library |
| 9 | Sort and filter | ✅ Done | Filter counts match the data. Bookcase locations removed at your request |
| 10 | Book page | ✅ Done | Every copy, series volumes, and the source of each value |
| 11 | Quick edits | ✅ Done | 10 automated checks pass. You've already used it live: 32 read statuses, 24 print types, 1 loan |
| 12 | Bookstore lookup | ✅ Done | Own it / own books in this series / not in your library, plus series gaps |
| 13 | Phone app and safety nets | ✅ Done | Installed on your Pixel; CSV and full backup tested on your real data; daily check-in confirmed reaching the database |
| 14 | Demo | ✅ Done | This review |

## Checks run for the demo

- **Code:** builds cleanly, no type or lint errors, `npm audit` finds 0 vulnerabilities.
- **Privacy:**
  - Every page except sign-in sends logged-out visitors to sign-in.
  - Backups need your login.
  - The daily check-in refuses anyone without its secret.
  - In the database, logged-out visitors are refused on every table.
  - Only your account exists, and sign-ups are off.
- **Supabase security advisor:** one note, "leaked password protection". That's a paid-plan feature, so it doesn't apply on the free plan.
- **Data health:**
  - Every book has at least one copy, and no records are orphaned.
  - The only same-title pairs are genuinely different books ("Come As You Are", "Wildfire").
- **Screens:** sign-in, library (covers and table), filters, quick-edit pop-up, book page, lookup and Check covers, at phone width and on desktop, in light and dark mode. One small fix made during the demo: on colour cards, the ✎ button no longer covers the author's name.

## Worth knowing / tidy-up before or during Phase 2

1. **You can't yet fix a book's title, author or series in the app.** Quick edits cover status, rating, loans, keepsakes, Reference and print type, but not the book's own details. This matters for these 11 flagged books:
   - Amanda Quick title, blue spine
   - Amanda Quick title, lilac spine
   - Lisa Kleypas title, far left, blurry
   - romance, far left, blurry
   - small pink "I'm the…" book
   - The Companion
   - The Darkness…
   - Lisbon Poets
   - Meditations for Makers
   - Unravelling Canada
   - Who Was Betty?

   It also matters for 8 books with no author recorded (e.g. Afterglow, Holy Bible, This Place: 150 Years Retold). **Suggestion:** add an "Edit details" form as the very first piece of Phase 2.
2. **527 print copies still say "Print (type not set)".** Use Filters → Format → Print (type not set), then Select.
3. **454 books show a colour card instead of a cover.** Phase 2's ISBN lookup will fill most of these. A free Google Books key would help too.
4. **Genres are rough** and only cover the ~460 books from the earlier list. Collections don't list their stories or essays yet. Series gaps only count up to the highest volume you own. All three are Phase 2 work.
5. **The Supabase access token** I use for database changes expires around **November 22**. The app itself isn't affected. If we're still building then, I'll walk you through making a new one.
6. **The "Check your import" page** (/import) is finished with and can't run again. It can be removed whenever you like.

## Costs right now

$0 a month: Supabase free plan, Vercel Hobby, Open Library. No Claude API account yet; that starts in Phase 2, with a cost estimate first.
