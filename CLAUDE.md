# Home Library Catalog

A private web app for Alexandra's personal book collection (print, ebook, audiobook). The full product spec is in `docs/build-plan.md`. Read it before planning any feature, and treat it as the source of truth. If the code and the plan disagree, ask before changing either.

## Who this is for

One user, Alexandra. She is not a developer: explain choices in plain language, keep setup steps short and explicit, and tell her exactly what to click or type when she has to do something (create an account, copy a key, run a command).

## Stack (proposed; confirm with Alexandra before starting)

- **App:** Next.js (App Router) + TypeScript + Tailwind CSS, installable as a PWA so it works like an app on her phone.
- **Database, login, file storage:** Supabase (Postgres, Auth, Storage).
- **Hosting:** Vercel.
- **Book metadata:** Open Library API and Google Books API (by ISBN or title/author), including cover images.
- **AI features:** Anthropic Claude API, called only from server routes. Used for prefill (classification, representation, series, story focus) and "Ask your library".
- **Barcode scanning:** browser camera with a ZXing-based library.
- **Charts:** Recharts (or similar), styled to the app's palette.

Use current stable versions. Pin dependencies.

## Non-negotiable rules

1. **Owner-only editing.** Exactly one login (Alexandra's email), and only she can change anything. Turn on Row Level Security for every table, with policies limited to her user id. One optional **secret view-only link** (decided 2026-10-27, `docs/sharing-plan.md`), which she can turn on, reset or turn off: it shows everything in the app, including future dashboards and stats, except loans, keepsake notes and the Gone list, and never any editing. No sign-up page; no other public routes. Never commit secrets; keep keys in `.env.local` and Vercel environment variables, and add `.env.example` with placeholder names only.
2. **Representation data is never inferred.** Author identity fields are filled only from the author's own public self-identification, with a source URL stored beside each value. Otherwise the value is `unknown`. Never guess from names, photos, nationality or writing. Character representation is pre-filled only from publisher text or community representation tags, with the source recorded. Every pre-filled value is editable and shows its source.
3. **Every pre-filled field is reviewable.** Store `value`, `source` (`openlibrary`, `googlebooks`, `claude`, `alexandra`, URL) and `confirmed` (bool). Alexandra's edits always win and are never overwritten by a later prefill.
4. **One entry per title.** Formats are copies inside a title (see the data model in the plan). Never create a duplicate title for a second format.
5. **Use Alexandra's wording.** "Smut" (not "erotica"), the Scoville Smut Scale labels, her star-scale labels, "Partly read", "On loan to". Never use "clean" for low spice.
6. **Stats exclude** the excluded category (colouring, art/craft reference, picture books, reference books such as cookbooks) and cover owned books only.
7. **Ask your library is read-only.** The model never writes raw SQL against the database. It calls typed, read-only query tools (filter, group by, count, average, list) that run server-side, under her user id, and return results the UI renders as a chart, table or sentence.
8. **AI prefill is a suggestion.** It goes into a review screen, never straight into saved data, except for bulk prefill jobs she explicitly starts. Those mark every value `confirmed: false`.

## Data

- `Books/` holds Alexandra's own photos and screenshots of her whole library:
  - `Books/Print books/Read/` and `Books/Print books/Unread/`: shelf photos; the folder sets read status
  - `Books/ebooks/` and `Books/Audiobooks/`: app screenshots (Kobo, Audible, Libro.fm) that show read status
  Use them to build the full import. Read titles, authors and read status from the images, match ebook/audiobook entries to existing print titles (one title, several copies), and show Alexandra every uncertain read or match in a review list before saving. These images are her originals: never move, rename or edit them.

- `data/seed-books.json` / `.csv`: 428 print titles catalogued from shelf photos. `format` is unknown (needs hardcover / trade / mass-market). `genre_guess` is a rough starting point. `needs_check: true` rows have an uncertain title or author: import them, but flag them in the UI.
- The seed came from an earlier pass over the same shelves. Treat the `Books/` photos as the source of truth and use the seed to cross-check.
- Manga runs (Bastard!!, Mars, Ouran High School Host Club) are single rows in the seed. Split them into one title per volume within a series on import.

## Working style

- Build in the phases from the plan. Finish, test and demo each phase before starting the next.
- At the start of each phase, write a short plan and wait for Alexandra's OK.
- Ask before adding any paid service or anything that costs money per use. Show estimated monthly cost for the Claude API features.
- Write migrations for every schema change. Seed scripts must be safe to re-run.
- Mobile first: test every screen at 390px wide, plus light and dark mode.
- Keep a `docs/CHANGELOG.md` of what was built, in plain language.
