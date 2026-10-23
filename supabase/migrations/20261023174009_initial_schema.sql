-- Home Library: initial schema (Phase 1, step 3).
-- Every table belongs to one owner and is locked to that owner by Row Level
-- Security. See docs/phase-1-plan.md, section 2, for the plain-language map.

-------------------------------------------------------------------------------
-- Lists of allowed values
-------------------------------------------------------------------------------

create type public.read_status as enum ('unread', 'partly_read', 'read');

create type public.book_type as enum (
  'prose', 'graphic_novel', 'manga', 'comic_collection', 'picture_book', 'poetry'
);

create type public.copy_format as enum (
  'hardcover', 'trade_paperback', 'mass_market', 'print_unknown', 'ebook', 'audiobook'
);

create type public.copy_source as enum ('shelf', 'kobo', 'audible', 'librofm', 'other');

create type public.edition_type as enum ('single_volume', 'omnibus', 'deluxe_hardcover');

-- Scoville Smut Scale, mildest to most explicit.
create type public.spice_level as enum (
  'green_pepper', 'yellow_pepper', 'orange_pepper',
  'red_pepper_1', 'red_pepper_2', 'red_pepper_3', 'red_pepper_4', 'red_pepper_5'
);

create type public.story_focus as enum ('plot_led', 'balanced', 'spice_led');

-- Cozy/feel-good → Light/fun → Dramatic/heavy → Intense/dark
create type public.vibe as enum ('cozy', 'light', 'dramatic', 'intense');

create type public.credit_role as enum (
  'author', 'writer', 'artist', 'editor', 'translator', 'narrator'
);

create type public.piece_kind as enum ('story', 'essay', 'poem', 'other');

create type public.tag_kind as enum (
  'genre', 'subgenre', 'trope', 'subject', 'reason',
  'gn_style', 'manga_demographic', 'franchise'
);

create type public.identity_category as enum (
  'gender_identity', 'race_ethnicity', 'lgbtqia', 'disability',
  'neurodivergence', 'nationality_region'
);

create type public.import_kind as enum (
  'title_uncertain', 'match_uncertain', 'status_conflict', 'status_needed'
);

create type public.import_decision as enum ('pending', 'accepted', 'edited', 'skipped');

-- Where a value came from: openlibrary, googlebooks, claude, alexandra,
-- import, or a web address.
create domain public.value_source as text
  check (value in ('openlibrary', 'googlebooks', 'claude', 'alexandra', 'import')
         or value ~ '^https?://');

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- Series
-------------------------------------------------------------------------------

create table public.series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (btrim(name) <> ''),
  sort_name text,
  total_volumes integer check (total_volumes > 0),
  is_complete boolean,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index series_owner_name_key on public.series (owner_id, lower(name));

-------------------------------------------------------------------------------
-- Titles: one per book, however many formats are owned
-------------------------------------------------------------------------------

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (btrim(title) <> ''),
  subtitle text,
  sort_title text,
  series_id uuid references public.series on delete set null,
  series_number numeric(6, 2),
  book_type public.book_type not null default 'prose',
  read_status public.read_status not null default 'unread',
  -- Reference toggle: kept in the catalog, left out of stats.
  is_reference boolean not null default false,
  romantic_subplot boolean,
  spice public.spice_level,
  story_focus public.story_focus,
  vibe_main public.vibe,
  vibe_second public.vibe,
  own_voices boolean,
  description text,
  -- Uncertain title or author from the shelf photos.
  needs_check boolean not null default false,
  check_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vibe_second is null or vibe_main is not null),
  check (series_number is null or series_id is not null)
);
create index titles_owner_idx on public.titles (owner_id);
create index titles_series_idx on public.titles (series_id);
create index titles_sort_idx on public.titles (owner_id, (coalesce(sort_title, title)));

-------------------------------------------------------------------------------
-- Copies: one per format owned, inside a title
-------------------------------------------------------------------------------

create table public.copies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title_id uuid not null references public.titles on delete cascade,
  format public.copy_format not null,
  source public.copy_source not null,
  location text,
  publisher text,
  edition text,
  edition_type public.edition_type,
  isbn13 text check (isbn13 ~ '^97[89][0-9]{10}$'),
  isbn10 text check (isbn10 ~ '^[0-9]{9}[0-9X]$'),
  cover_path text,
  cover_url text,
  cover_confirmed boolean not null default false,
  pages integer check (pages > 0),
  audio_minutes integer check (audio_minutes > 0),
  est_words integer check (est_words > 0),
  -- Omnibus / collected editions: which volumes this copy contains.
  contains_from numeric(6, 2),
  contains_to numeric(6, 2),
  bonus_notes text,
  keepsake_notes text,
  -- Name only; cleared on return. Still counts as owned.
  on_loan_to text,
  -- Store or app id (Kobo, Audible, Libro.fm) for matching re-imports.
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contains_to is null or contains_from is not null),
  check (contains_to is null or contains_to >= contains_from)
);
create index copies_owner_idx on public.copies (owner_id);
create index copies_title_idx on public.copies (title_id);
create unique index copies_isbn13_key on public.copies (owner_id, isbn13) where isbn13 is not null;
create unique index copies_external_key on public.copies (owner_id, source, external_id)
  where external_id is not null;

-------------------------------------------------------------------------------
-- People: authors, writers, artists, editors, translators, narrators
-------------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (btrim(name) <> ''),
  sort_name text,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index people_owner_name_key on public.people (owner_id, lower(name));

-------------------------------------------------------------------------------
-- Pieces: stories, essays and poems inside a collection
-------------------------------------------------------------------------------

create table public.pieces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title_id uuid not null references public.titles on delete cascade,
  position integer not null check (position > 0),
  piece_title text not null check (btrim(piece_title) <> ''),
  kind public.piece_kind not null default 'story',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title_id, position)
);
create index pieces_owner_idx on public.pieces (owner_id);

-------------------------------------------------------------------------------
-- Credits: who made a title, a piece, or (for narrators) an audiobook copy
-------------------------------------------------------------------------------

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  person_id uuid not null references public.people on delete cascade,
  role public.credit_role not null,
  position smallint not null default 1,
  title_id uuid references public.titles on delete cascade,
  piece_id uuid references public.pieces on delete cascade,
  copy_id uuid references public.copies on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(title_id, piece_id, copy_id) = 1),
  check ((role = 'narrator') = (copy_id is not null))
);
create index credits_owner_idx on public.credits (owner_id);
create index credits_person_idx on public.credits (person_id);
create unique index credits_title_key on public.credits (title_id, person_id, role) where title_id is not null;
create unique index credits_piece_key on public.credits (piece_id, person_id, role) where piece_id is not null;
create unique index credits_copy_key on public.credits (copy_id, person_id, role) where copy_id is not null;

-------------------------------------------------------------------------------
-- Author identity: only the author's own public self-identification,
-- always with the link to their words. No row means "unknown".
-------------------------------------------------------------------------------

create table public.author_identities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  person_id uuid not null references public.people on delete cascade,
  category public.identity_category not null,
  value text not null check (btrim(value) <> ''),
  source public.value_source not null,
  source_url text check (source_url ~ '^https?://'),
  -- The author's own words, quoted from the source.
  quote text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Prefilled values must point to the author's own words.
  check (source = 'alexandra' or source_url is not null),
  unique (person_id, category, value)
);
create index author_identities_owner_idx on public.author_identities (owner_id);

-------------------------------------------------------------------------------
-- Character representation: from publisher text or community rep tags
-------------------------------------------------------------------------------

create table public.character_representations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title_id uuid not null references public.titles on delete cascade,
  category public.identity_category not null,
  value text not null check (btrim(value) <> ''),
  character_name text,
  source public.value_source not null,
  source_url text check (source_url ~ '^https?://'),
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source = 'alexandra' or source_url is not null)
);
create index character_representations_owner_idx on public.character_representations (owner_id);
create index character_representations_title_idx on public.character_representations (title_id);

-------------------------------------------------------------------------------
-- Tags: genres, subgenres, tropes, subjects, reasons for reading,
-- graphic-novel style, manga demographic, franchise. All extendable.
-------------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind public.tag_kind not null,
  name text not null check (btrim(name) <> ''),
  -- Starter-list entries wait for Alexandra's approval before bulk prefill.
  approved boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tags_owner_kind_name_key on public.tags (owner_id, kind, lower(name));

create table public.title_tags (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title_id uuid not null references public.titles on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  -- The primary genre shows first (Smut for spice-led books).
  is_primary boolean not null default false,
  source public.value_source not null default 'alexandra',
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (title_id, tag_id)
);
create index title_tags_owner_idx on public.title_tags (owner_id);
create index title_tags_tag_idx on public.title_tags (tag_id);

-------------------------------------------------------------------------------
-- Reviews: for a title, a copy (format review), a series or a piece
-------------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  title_id uuid references public.titles on delete cascade,
  copy_id uuid references public.copies on delete cascade,
  series_id uuid references public.series on delete cascade,
  piece_id uuid references public.pieces on delete cascade,
  -- Quarter stars, 0.25 to 5.
  rating numeric(3, 2) check (rating between 0.25 and 5 and rating * 4 = trunc(rating * 4)),
  body text,
  broke_my_brain boolean,
  mood_reactions text[] not null default '{}',
  would_reread boolean,
  favourite_quote text,
  recommend_to text,
  confirmed_spice public.spice_level,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(title_id, copy_id, series_id, piece_id) = 1)
);
create index reviews_owner_idx on public.reviews (owner_id);
create unique index reviews_title_key on public.reviews (title_id) where title_id is not null;
create unique index reviews_copy_key on public.reviews (copy_id) where copy_id is not null;
create unique index reviews_series_key on public.reviews (series_id) where series_id is not null;
create unique index reviews_piece_key on public.reviews (piece_id) where piece_id is not null;

-------------------------------------------------------------------------------
-- Field sources: where each pre-filled value came from, and whether
-- Alexandra has confirmed it. Her edits are marked 'alexandra' and win.
-------------------------------------------------------------------------------

create table public.field_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  entity_table text not null check (entity_table in ('titles', 'copies', 'series', 'people', 'pieces')),
  entity_id uuid not null,
  field text not null,
  source public.value_source not null,
  source_url text check (source_url ~ '^https?://'),
  confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (entity_table, entity_id, field)
);
create index field_sources_owner_idx on public.field_sources (owner_id);

-- Safety net for rule 3: once Alexandra has set a value, no prefill can
-- take it back.
create function public.protect_alexandra_values() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.source = 'alexandra' and new.source <> 'alexandra' then
    raise exception 'Field %.% was set by Alexandra and cannot be overwritten by %',
      old.entity_table, old.field, new.source;
  end if;
  return new;
end;
$$;

create trigger field_sources_protect
  before update on public.field_sources
  for each row execute function public.protect_alexandra_values();

-- Remove the source records when the thing they describe is deleted.
create function public.delete_field_sources() returns trigger
language plpgsql set search_path = '' as $$
begin
  delete from public.field_sources
  where entity_table = tg_table_name and entity_id = old.id;
  return old;
end;
$$;

-------------------------------------------------------------------------------
-- Saved reports: pinned answers from Ask your library
-------------------------------------------------------------------------------

create table public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (btrim(name) <> ''),
  question text,
  -- The read-only query and chart settings needed to redraw the answer.
  spec jsonb not null,
  chart_type text not null,
  pinned boolean not null default true,
  position integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_reports_owner_idx on public.saved_reports (owner_id);

-------------------------------------------------------------------------------
-- Import review list: uncertain reads and matches waiting on Alexandra
-------------------------------------------------------------------------------

create table public.import_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  batch text not null,
  kind public.import_kind not null,
  -- Stable key so re-running an import updates rather than duplicates.
  item_key text not null,
  source_file text,
  raw jsonb not null default '{}',
  suggested jsonb not null default '{}',
  matched_title_id uuid references public.titles on delete set null,
  decision public.import_decision not null default 'pending',
  decided_value jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, batch, item_key)
);
create index import_items_pending_idx on public.import_items (owner_id, decision);

-------------------------------------------------------------------------------
-- Triggers shared by several tables
-------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'series', 'titles', 'copies', 'people', 'pieces', 'author_identities',
    'character_representations', 'tags', 'reviews', 'field_sources',
    'saved_reports', 'import_items'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;

  foreach t in array array['titles', 'copies', 'series', 'people', 'pieces'] loop
    execute format(
      'create trigger %I after delete on public.%I
         for each row execute function public.delete_field_sources()',
      t || '_delete_sources', t);
  end loop;
end;
$$;

-------------------------------------------------------------------------------
-- Owner-only access (rule 1). Logged-out visitors get nothing; a signed-in
-- user sees and changes only rows they own.
-------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'series', 'titles', 'copies', 'people', 'pieces', 'credits',
    'author_identities', 'character_representations', 'tags', 'title_tags',
    'reviews', 'field_sources', 'saved_reports', 'import_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (owner_id = (select auth.uid()))
         with check (owner_id = (select auth.uid()))',
      'owner_only', t);
  end loop;
end;
$$;

-- Keep the helper functions private.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.protect_alexandra_values() from public, anon, authenticated;
revoke execute on function public.delete_field_sources() from public, anon, authenticated;

-- Tables created later in this schema don't open up to logged-out visitors
-- by default.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;

-------------------------------------------------------------------------------
-- Cover images: a private storage bucket. Each file lives in a folder named
-- after the owner's user id.
-------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy covers_owner_only on storage.objects for all to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
