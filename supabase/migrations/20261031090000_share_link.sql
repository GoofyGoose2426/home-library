-- A secret view-only link (docs/sharing-plan.md). A viewer's request carries
-- a key in the x-share-key header (a hash of the link's code; the code itself
-- is never stored). While a link is on, that key lets the request READ
-- Alexandra's library, except:
--   * loans and keepsake notes: those copy columns are never granted;
--   * the Gone list: gone copies, and books with no owned copy, are hidden;
--   * anything private to the app's running (imports, share links).
-- Viewers can never write: anon gets SELECT only.

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- sha256 of the link's code, in hex.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  turned_off_at timestamptz
);
-- One live link at a time.
create unique index share_links_one_live on public.share_links (owner_id) where turned_off_at is null;

alter table public.share_links enable row level security;
create policy owner_only on public.share_links
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
revoke all on public.share_links from anon;

-- Whose library the request's key opens, or null.
create function public.shared_owner()
returns uuid
language sql stable security definer set search_path = '' as $$
  select s.owner_id from public.share_links s
  where s.turned_off_at is null
    and s.token_hash = nullif(current_setting('request.headers', true)::json ->> 'x-share-key', '')
  limit 1;
$$;
revoke execute on function public.shared_owner() from public;
grant execute on function public.shared_owner() to anon, authenticated;

-- Read access for viewers, row by row.
create policy shared_view on public.copies for select to anon
  using (owner_id = (select public.shared_owner()) and gone_at is null);
create policy shared_view on public.titles for select to anon
  using (owner_id = (select public.shared_owner())
         and exists (select 1 from public.copies c where c.title_id = titles.id));
create policy shared_view on public.reviews for select to anon
  using (owner_id = (select public.shared_owner())
         and (copy_id is null or exists (select 1 from public.copies c where c.id = reviews.copy_id)));

do $$
declare
  t text;
begin
  foreach t in array array[
    'series', 'people', 'credits', 'pieces', 'tags', 'title_tags', 'tag_parents',
    'author_identities', 'character_representations', 'field_sources', 'saved_reports'
  ] loop
    execute format(
      'create policy shared_view on public.%I for select to anon using (owner_id = (select public.shared_owner()))', t);
    execute format('grant select on public.%I to anon', t);
  end loop;
end $$;

grant select on public.titles to anon;
grant select on public.reviews to anon;
-- Every copy column except loans, keepsake notes and why a copy left.
grant select (
  id, owner_id, title_id, format, source, publisher, edition, edition_type, isbn13, isbn10,
  cover_path, cover_url, cover_confirmed, pages, audio_minutes, est_words, contains_from,
  contains_to, bonus_notes, created_at, updated_at, gone_at
) on public.copies to anon;
