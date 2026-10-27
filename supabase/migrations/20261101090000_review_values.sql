-- Phase 2, step 4: the "To check" screen. Values filled in for Alexandra
-- (Open Library, Google Books, later Claude) and genres from her shelf photos
-- wait there, unconfirmed. She can confirm one, edit it, reject it, or
-- confirm every one of a field at once. Edits and rejections become hers,
-- so no later fill-in brings a rejected value back.

-- The fields this screen handles, and how each is stored.
create function public.review_column(p_table text, p_field text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_table = 'titles' and p_field in ('description', 'first_published', 'typical_pages', 'series') then p_field
    when p_table = 'copies' and p_field in ('publisher', 'pages', 'est_words') then p_field
  end;
$$;

-- p_action: 'confirm' | 'reject' | 'edit' (p_value is the new value, as text).
create function public.review_value(p_action text, p_table text, p_id uuid, p_field text, p_value text)
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

-- Genres and other list values on a book that she didn't set herself.
-- Rejecting one removes it and remembers that, so it isn't suggested again.
create function public.review_tag(p_action text, p_title_id uuid, p_tag_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_action not in ('confirm', 'reject') then
    raise exception 'That can''t be checked here.';
  end if;
  if not exists (select 1 from public.title_tags where title_id = p_title_id and tag_id = p_tag_id) then
    raise exception 'That value wasn''t found.';
  end if;
  if p_action = 'confirm' then
    update public.title_tags set confirmed = true where title_id = p_title_id and tag_id = p_tag_id;
  else
    delete from public.title_tags where title_id = p_title_id and tag_id = p_tag_id;
    insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
    values ('titles', p_title_id, 'tag:' || p_tag_id, 'alexandra', true)
    on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
  end if;
end;
$$;

-- Confirms every waiting value of one field ('titles.description',
-- 'copies.est_words', 'tags.genre', …). Returns how many.
create function public.confirm_all(p_field text)
returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_table text := split_part(p_field, '.', 1);
  v_name text := split_part(p_field, '.', 2);
  v_count integer;
begin
  if v_table = 'tags' then
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

revoke execute on function public.review_column(text, text) from public, anon;
revoke execute on function public.review_value(text, text, uuid, text, text) from public, anon;
revoke execute on function public.review_tag(text, uuid, uuid) from public, anon;
revoke execute on function public.confirm_all(text) from public, anon;
grant execute on function public.review_column(text, text) to authenticated;
grant execute on function public.review_value(text, text, uuid, text, text) to authenticated;
grant execute on function public.review_tag(text, uuid, uuid) to authenticated;
grant execute on function public.confirm_all(text) to authenticated;
