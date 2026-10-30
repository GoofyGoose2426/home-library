-- Phase 2, step 6: author pages and representation
-- (docs/author-representation-plan.md).
--
-- Author identity comes only from the author's own public words: a link and
-- a quote are kept beside every suggested value. Character representation
-- comes only from publisher text or community representation lists. Both
-- arrive unconfirmed and wait in To check. Rejected values are remembered so
-- a later lookup never brings them back, and Alexandra's values always win.

-- When an author was last looked up, so "looked, nothing public" can be told
-- apart from "not looked up yet".
alter table public.people add column identity_checked_at timestamptz;

-- The line in the publisher text or representation list that says it.
alter table public.character_representations add column quote text;
create unique index character_representations_value_key
  on public.character_representations (title_id, category, lower(value));

-- Viewers of the share link see only values Alexandra has confirmed.
drop policy shared_view on public.author_identities;
create policy shared_view on public.author_identities for select to anon
  using (owner_id = (select public.shared_owner()) and confirmed);
drop policy shared_view on public.character_representations;
create policy shared_view on public.character_representations for select to anon
  using (owner_id = (select public.shared_owner()) and confirmed);

-- To check: own voices joins the story fields (confirm or reject only).
create or replace function public.review_column(p_table text, p_field text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_table = 'titles' and p_field in (
      'description', 'first_published', 'typical_pages', 'series',
      'audience', 'romantic_subplot', 'spice', 'story_focus', 'vibe', 'own_voices') then p_field
    when p_table = 'copies' and p_field in ('publisher', 'pages', 'est_words') then p_field
  end;
$$;

create or replace function public.review_value(p_action text, p_table text, p_id uuid, p_field text, p_value text)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_col text := public.review_column(p_table, p_field);
  v_found boolean;
begin
  if v_col is null or p_action not in ('confirm', 'reject', 'edit') then
    raise exception 'That can''t be checked here.';
  end if;
  execute format('select exists (select 1 from public.%I where id = $1)', p_table) into v_found using p_id;
  if not v_found then
    raise exception 'That book wasn''t found.';
  end if;

  if p_action = 'confirm' then
    update public.field_sources set confirmed = true
    where entity_table = p_table and entity_id = p_id and field = p_field;
    return;
  end if;

  if v_col = 'series' then
    if p_action = 'edit' then
      raise exception 'Change the series with Edit details on the book page.';
    end if;
    update public.titles set series_id = null, series_number = null where id = p_id;
  elsif v_col = 'own_voices' then
    if p_action = 'edit' then
      raise exception 'Change own voices on the book page.';
    end if;
    update public.titles set own_voices = null where id = p_id;
  elsif v_col in ('audience', 'romantic_subplot', 'spice', 'story_focus', 'vibe') then
    if p_action = 'edit' then
      raise exception 'Change this with Edit classification on the book page.';
    end if;
    if v_col = 'vibe' then
      update public.titles set vibe_main = null, vibe_second = null where id = p_id;
    else
      execute format('update public.titles set %I = null where id = $1', v_col) using p_id;
    end if;
  elsif p_action = 'reject' then
    execute format('update public.%I set %I = null where id = $1', p_table, v_col) using p_id;
  elsif v_col in ('description', 'publisher') then
    if coalesce(btrim(p_value), '') = '' then
      raise exception 'Type a value, or use Reject to clear it.';
    end if;
    execute format('update public.%I set %I = $2 where id = $1', p_table, v_col)
      using p_id, left(btrim(p_value), case when v_col = 'description' then 5000 else 200 end);
  else
    if p_value !~ '^\s*[0-9]{1,7}\s*$' then
      raise exception 'That should be a whole number.';
    end if;
    execute format('update public.%I set %I = $2::int where id = $1', p_table, v_col) using p_id, btrim(p_value);
  end if;

  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  values (p_table, p_id, p_field, 'alexandra', true)
  on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
end;
$$;

-- The marker that remembers a rejected value: on the author for identity
-- ('identity:<category>:<value>'), on the book for characters ('rep:…').
create function public.rejected_marker(p_prefix text, p_category public.identity_category, p_value text)
returns text
language sql immutable set search_path = '' as $$
  select p_prefix || ':' || p_category::text || ':' || lower(btrim(p_value));
$$;

-- p_kind: 'author' (an author_identities row) or 'character'
-- (a character_representations row). p_action: 'confirm' | 'reject'.
-- Rejecting removes the value and remembers it. Also used to remove a value
-- on the author or book page.
create function public.review_identity(p_action text, p_kind text, p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_row record;
begin
  if p_action not in ('confirm', 'reject') or p_kind not in ('author', 'character') then
    raise exception 'That can''t be checked here.';
  end if;
  if p_kind = 'author' then
    select person_id as entity_id, category, value into v_row from public.author_identities where id = p_id;
  else
    select title_id as entity_id, category, value into v_row from public.character_representations where id = p_id;
  end if;
  if not found then
    raise exception 'That value wasn''t found.';
  end if;

  if p_action = 'confirm' then
    if p_kind = 'author' then
      update public.author_identities set confirmed = true where id = p_id;
    else
      update public.character_representations set confirmed = true where id = p_id;
    end if;
    return;
  end if;

  if p_kind = 'author' then
    delete from public.author_identities where id = p_id;
  else
    delete from public.character_representations where id = p_id;
  end if;
  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  values (
    case when p_kind = 'author' then 'people' else 'titles' end,
    v_row.entity_id,
    public.rejected_marker(case when p_kind = 'author' then 'identity' else 'rep' end, v_row.category, v_row.value),
    'alexandra', true)
  on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
end;
$$;

-- Alexandra adds a value herself (a link and quote are optional for her).
-- If the same value was suggested, it becomes hers and keeps its link.
create function public.add_author_identity(
  p_person uuid, p_category public.identity_category, p_value text, p_url text, p_quote text)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_value text := left(btrim(coalesce(p_value, '')), 120);
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if v_value = '' then
    raise exception 'Type or pick a value.';
  end if;
  if v_url is not null and v_url !~ '^https?://' then
    raise exception 'The link should start with https://';
  end if;
  if not exists (select 1 from public.people where id = p_person) then
    raise exception 'That author wasn''t found.';
  end if;
  insert into public.author_identities (person_id, category, value, source, source_url, quote, confirmed)
  values (p_person, p_category, v_value, 'alexandra', v_url, left(nullif(btrim(coalesce(p_quote, '')), ''), 600), true)
  on conflict (person_id, category, value) do update set
    source = 'alexandra',
    confirmed = true,
    source_url = coalesce(excluded.source_url, public.author_identities.source_url),
    quote = coalesce(excluded.quote, public.author_identities.quote);
end;
$$;

create function public.add_character_rep(
  p_title uuid, p_category public.identity_category, p_value text, p_character text, p_url text, p_quote text)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_value text := left(btrim(coalesce(p_value, '')), 120);
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_id uuid;
begin
  if v_value = '' then
    raise exception 'Type or pick a value.';
  end if;
  if v_url is not null and v_url !~ '^https?://' then
    raise exception 'The link should start with https://';
  end if;
  if not exists (select 1 from public.titles where id = p_title) then
    raise exception 'That book wasn''t found.';
  end if;
  select id into v_id from public.character_representations
  where title_id = p_title and category = p_category and lower(value) = lower(v_value);
  if v_id is null then
    insert into public.character_representations (title_id, category, value, character_name, source, source_url, quote, confirmed)
    values (p_title, p_category, v_value, left(nullif(btrim(coalesce(p_character, '')), ''), 120),
            'alexandra', v_url, left(nullif(btrim(coalesce(p_quote, '')), ''), 600), true);
  else
    update public.character_representations set
      source = 'alexandra',
      confirmed = true,
      character_name = coalesce(left(nullif(btrim(coalesce(p_character, '')), ''), 120), character_name),
      source_url = coalesce(v_url, source_url),
      quote = coalesce(left(nullif(btrim(coalesce(p_quote, '')), ''), 600), quote)
    where id = v_id;
  end if;
end;
$$;

-- Own voices, set by Alexandra (null clears it).
create function public.set_own_voices(p_title uuid, p_value boolean)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update public.titles set own_voices = p_value where id = p_title;
  if not found then
    raise exception 'That book wasn''t found.';
  end if;
  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  values ('titles', p_title, 'own_voices', 'alexandra', true)
  on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
end;
$$;

-- Confirm all: also 'identity.author' and 'identity.character'.
create or replace function public.confirm_all(p_field text)
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_table text := split_part(p_field, '.', 1);
  v_name text := split_part(p_field, '.', 2);
  v_count integer;
begin
  if p_field = 'identity.author' then
    update public.author_identities set confirmed = true where not confirmed;
  elsif p_field = 'identity.character' then
    update public.character_representations set confirmed = true where not confirmed;
  elsif v_table = 'tags' then
    update public.title_tags tt set confirmed = true
    from public.tags g
    where g.id = tt.tag_id and g.kind::text = v_name and g.kind <> 'rough_genre' and not tt.confirmed;
  elsif public.review_column(v_table, v_name) is not null then
    update public.field_sources set confirmed = true
    where entity_table = v_table and field = v_name and not confirmed and source <> 'alexandra';
  else
    raise exception 'That can''t be confirmed here.';
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.rejected_marker(text, public.identity_category, text) from public, anon;
revoke execute on function public.review_identity(text, text, uuid) from public, anon;
revoke execute on function public.add_author_identity(uuid, public.identity_category, text, text, text) from public, anon;
revoke execute on function public.add_character_rep(uuid, public.identity_category, text, text, text, text) from public, anon;
revoke execute on function public.set_own_voices(uuid, boolean) from public, anon;
grant execute on function public.rejected_marker(text, public.identity_category, text) to authenticated;
grant execute on function public.review_identity(text, text, uuid) to authenticated;
grant execute on function public.add_author_identity(uuid, public.identity_category, text, text, text) to authenticated;
grant execute on function public.add_character_rep(uuid, public.identity_category, text, text, text, text) to authenticated;
grant execute on function public.set_own_voices(uuid, boolean) to authenticated;
