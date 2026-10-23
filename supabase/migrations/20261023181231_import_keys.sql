-- Stable keys from the photo import (data/import/plan.json) so saving the
-- import again adds only what's missing and never touches existing rows.

alter table public.titles add column import_key text;
alter table public.titles add constraint titles_owner_import_key_key unique (owner_id, import_key);

alter table public.copies add column import_key text;
alter table public.copies add constraint copies_owner_import_key_key unique (owner_id, import_key);

-- One row per finished import, so a finished import is never re-applied
-- (it would bring back books Alexandra has since removed).
create table public.import_batches (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  batch text not null,
  saved_at timestamptz not null default now(),
  summary jsonb not null default '{}',
  primary key (owner_id, batch)
);
alter table public.import_batches enable row level security;
revoke all on public.import_batches from anon;
create policy owner_only on public.import_batches for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
