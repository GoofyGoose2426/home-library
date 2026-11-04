# Throwaway-database tests

These build a brand-new, in-memory Postgres (PGlite) on your computer, apply every migration in `supabase/migrations/`, and check the rules that matter most. They never touch the real Supabase database.

```bash
npm install --prefix scripts/db-tests
node scripts/db-tests/privacy-and-edits.test.mjs supabase/migrations
node scripts/db-tests/add-book.test.mjs supabase/migrations
```

- `privacy-and-edits`: row security on every table; logged-out visitors and other accounts see and change nothing; the view-only link hides loans, keepsake notes and the Gone list and can't edit; a wrong or turned-off link sees nothing; fill-in never replaces her values; author spellings don't make duplicates.
- `add-book`: the smarter add-a-book (Phase 2 step 7): details and their sources saved, unknown sources refused, people matched across spellings.

Supabase's own `auth` and `storage` schemas are stubbed at the top of each file.
