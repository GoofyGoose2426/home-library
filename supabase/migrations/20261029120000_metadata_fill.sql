-- Phase 2, step 3: fill in book details from Open Library and Google Books.
-- Values arrive unconfirmed, with their source, and only where the field is
-- empty or was filled by an earlier run. Anything Alexandra set (or cleared)
-- is left alone.

alter table public.titles
  add column first_published smallint check (first_published between 1000 and 2100),
  -- Pages in a typical edition (Open Library's median), for books whose own
  -- edition isn't known yet.
  add column typical_pages integer check (typical_pages > 0),
  add column openlibrary_key text check (openlibrary_key ~ '^/works/OL[0-9]+W$'),
  add column details_checked_at timestamptz;

-- p_title:  { source, description, first_published, typical_pages, openlibrary_key,
--             series, series_number }     (any may be missing)
-- p_copies: [{ id, source, publisher, pages, est_words }]
-- Returns the names of the fields it filled.
create function public.apply_book_details(p_title_id uuid, p_title jsonb, p_copies jsonb)
returns text[]
language plpgsql security invoker set search_path = '' as $$
declare
  v_filled text[] := '{}';
  v_src text := p_title ->> 'source';
  v_series uuid;
  v_title public.titles%rowtype;
  c jsonb;
  v_copy public.copies%rowtype;
begin
  select * into v_title from public.titles where id = p_title_id;
  if not found then
    raise exception 'That book wasn''t found.';
  end if;
  if v_src is not null and v_src not in ('openlibrary', 'googlebooks') then
    raise exception 'Unknown source.';
  end if;

  if v_src is not null then
    if nullif(btrim(p_title ->> 'description'), '') is not null
       and public.may_fill('titles', p_title_id, 'description', v_title.description is null) then
      update public.titles set description = left(btrim(p_title ->> 'description'), 5000) where id = p_title_id;
      perform public.mark_filled('titles', p_title_id, 'description', v_src);
      v_filled := array_append(v_filled, 'description');
    end if;
    if (p_title ->> 'first_published') is not null
       and public.may_fill('titles', p_title_id, 'first_published', v_title.first_published is null) then
      update public.titles set first_published = (p_title ->> 'first_published')::smallint where id = p_title_id;
      perform public.mark_filled('titles', p_title_id, 'first_published', v_src);
      v_filled := array_append(v_filled, 'first_published');
    end if;
    if (p_title ->> 'typical_pages') is not null
       and public.may_fill('titles', p_title_id, 'typical_pages', v_title.typical_pages is null) then
      update public.titles set typical_pages = (p_title ->> 'typical_pages')::int where id = p_title_id;
      perform public.mark_filled('titles', p_title_id, 'typical_pages', v_src);
      v_filled := array_append(v_filled, 'typical_pages');
    end if;
    -- A series only goes on a book that has none.
    if nullif(btrim(p_title ->> 'series'), '') is not null and v_title.series_id is null
       and public.may_fill('titles', p_title_id, 'series', true) then
      select id into v_series from public.series where lower(name) = lower(btrim(p_title ->> 'series'));
      if v_series is null then
        insert into public.series (name) values (btrim(p_title ->> 'series')) returning id into v_series;
      end if;
      update public.titles set series_id = v_series, series_number = (p_title ->> 'series_number')::numeric where id = p_title_id;
      perform public.mark_filled('titles', p_title_id, 'series', v_src);
      v_filled := array_append(v_filled, 'series');
    end if;
  end if;

  for c in select * from jsonb_array_elements(coalesce(p_copies, '[]'::jsonb)) loop
    select * into v_copy from public.copies where id = (c ->> 'id')::uuid and title_id = p_title_id;
    continue when not found or (c ->> 'source') not in ('openlibrary', 'googlebooks');
    if nullif(btrim(c ->> 'publisher'), '') is not null
       and public.may_fill('copies', v_copy.id, 'publisher', v_copy.publisher is null) then
      update public.copies set publisher = left(btrim(c ->> 'publisher'), 200) where id = v_copy.id;
      perform public.mark_filled('copies', v_copy.id, 'publisher', c ->> 'source');
      v_filled := array_append(v_filled, 'publisher');
    end if;
    if (c ->> 'pages') is not null and public.may_fill('copies', v_copy.id, 'pages', v_copy.pages is null) then
      update public.copies set pages = (c ->> 'pages')::int where id = v_copy.id;
      perform public.mark_filled('copies', v_copy.id, 'pages', c ->> 'source');
      v_filled := array_append(v_filled, 'pages');
    end if;
    if (c ->> 'est_words') is not null and public.may_fill('copies', v_copy.id, 'est_words', v_copy.est_words is null) then
      update public.copies set est_words = (c ->> 'est_words')::int where id = v_copy.id;
      perform public.mark_filled('copies', v_copy.id, 'est_words', c ->> 'source');
      v_filled := array_append(v_filled, 'est_words');
    end if;
  end loop;

  update public.titles set
    details_checked_at = now(),
    openlibrary_key = coalesce(openlibrary_key, nullif(p_title ->> 'openlibrary_key', ''))
  where id = p_title_id;
  return array(select distinct unnest(v_filled));
end;
$$;

-- A field can be filled when it's empty, or when an earlier run filled it
-- and she hasn't confirmed it. Never when she set or cleared it herself.
create function public.may_fill(p_table text, p_id uuid, p_field text, p_empty boolean)
returns boolean
language sql stable security invoker set search_path = '' as $$
  select case
    when fs.source = 'alexandra' or fs.confirmed then false
    when p_empty then true
    else fs.source in ('openlibrary', 'googlebooks')
  end
  from (select 1) one
  left join public.field_sources fs
    on fs.entity_table = p_table and fs.entity_id = p_id and fs.field = p_field;
$$;

create function public.mark_filled(p_table text, p_id uuid, p_field text, p_source text)
returns void
language sql security invoker set search_path = '' as $$
  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  values (p_table, p_id, p_field, p_source, false)
  on conflict (entity_table, entity_id, field) do update set source = excluded.source, confirmed = false;
$$;

revoke execute on function public.apply_book_details(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.may_fill(text, uuid, text, boolean) from public, anon;
revoke execute on function public.mark_filled(text, uuid, text, text) from public, anon;
grant execute on function public.apply_book_details(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.may_fill(text, uuid, text, boolean) to authenticated;
grant execute on function public.mark_filled(text, uuid, text, text) to authenticated;
