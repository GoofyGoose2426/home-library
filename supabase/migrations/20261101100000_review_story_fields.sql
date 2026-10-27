-- To check also lists the story fields Claude suggests (Phase 2, step 5):
-- audience, romantic subplot, spice, story focus and vibe. They can be
-- confirmed or rejected here; changing one is done in Edit classification.

create or replace function public.review_column(p_table text, p_field text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_table = 'titles' and p_field in (
      'description', 'first_published', 'typical_pages', 'series',
      'audience', 'romantic_subplot', 'spice', 'story_focus', 'vibe') then p_field
    when p_table = 'copies' and p_field in ('publisher', 'pages', 'est_words') then p_field
  end;
$$;

-- p_action: 'confirm' | 'reject' | 'edit' (p_value is the new value, as text).
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

