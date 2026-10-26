-- Adds a new book with its first copy, or (with p_title_id) another copy of a
-- book already in the library. All or nothing; runs as the signed-in user so
-- Row Level Security applies. Alexandra checked every value in the form, so
-- they're recorded as hers.

create function public.add_book(
  p_title_id uuid,   -- an existing book to add a copy to, or null for a new book
  p_book jsonb,      -- { title, subtitle, book_type, read_status, series, series_number,
                     --   credits: [{ name, role }] }      (ignored when p_title_id is set)
  p_copy jsonb       -- { format, source, isbn13, publisher, pages, cover_url, on_loan_to,
                     --   narrators: [name] }
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_title uuid := p_title_id;
  v_copy uuid;
  v_series uuid;
  v_person uuid;
  v_name text;
  v_pos int := 0;
  v_format public.copy_format := (p_copy ->> 'format')::public.copy_format;
  v_source public.copy_source := (p_copy ->> 'source')::public.copy_source;
  v_cover text := nullif(btrim(p_copy ->> 'cover_url'), '');
  c jsonb;
begin
  if v_cover is not null and v_cover !~ '^https://covers\.openlibrary\.org/b/id/[0-9]+-[SML]\.jpg$' then
    raise exception 'Covers can only come from Open Library here.';
  end if;
  if (v_format in ('ebook', 'audiobook')) = (v_source = 'shelf') then
    raise exception 'Print copies live on the bookshelf; ebooks and audiobooks live in an app.';
  end if;

  if v_title is null then
    if coalesce(btrim(p_book ->> 'title'), '') = '' then
      raise exception 'A title is required.';
    end if;
    if nullif(btrim(p_book ->> 'series'), '') is not null then
      select id into v_series from public.series where lower(name) = lower(btrim(p_book ->> 'series'));
      if v_series is null then
        insert into public.series (name) values (btrim(p_book ->> 'series')) returning id into v_series;
      end if;
    end if;
    insert into public.titles (title, subtitle, book_type, read_status, series_id, series_number)
    values (
      btrim(p_book ->> 'title'),
      nullif(btrim(p_book ->> 'subtitle'), ''),
      coalesce((p_book ->> 'book_type')::public.book_type, 'prose'),
      coalesce((p_book ->> 'read_status')::public.read_status, 'unread'),
      v_series,
      case when v_series is null then null else (p_book ->> 'series_number')::numeric end
    )
    returning id into v_title;

    for c in select * from jsonb_array_elements(coalesce(p_book -> 'credits', '[]'::jsonb)) loop
      v_name := btrim(c ->> 'name');
      continue when coalesce(v_name, '') = '';
      if (c ->> 'role') = 'narrator' then
        raise exception 'Narrators belong on an audiobook copy.';
      end if;
      select id into v_person from public.people where lower(name) = lower(v_name);
      if v_person is null then
        insert into public.people (name) values (v_name) returning id into v_person;
      end if;
      v_pos := v_pos + 1;
      insert into public.credits (person_id, role, position, title_id)
      values (v_person, (c ->> 'role')::public.credit_role, v_pos, v_title)
      on conflict do nothing;
    end loop;

    insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
    select 'titles', v_title, f, 'alexandra', true
    from unnest(array['title', 'subtitle', 'authors', 'series', 'book_type', 'read_status']) as f;
  elsif not exists (select 1 from public.titles where id = v_title) then
    raise exception 'That book wasn''t found.';
  end if;

  insert into public.copies (title_id, format, source, isbn13, publisher, pages, cover_url, cover_confirmed, on_loan_to)
  values (
    v_title,
    v_format,
    v_source,
    nullif(regexp_replace(coalesce(p_copy ->> 'isbn13', ''), '[^0-9]', '', 'g'), ''),
    nullif(btrim(p_copy ->> 'publisher'), ''),
    nullif(p_copy ->> 'pages', '')::int,
    v_cover,
    v_cover is not null,
    case when v_source = 'shelf' then nullif(btrim(p_copy ->> 'on_loan_to'), '') end
  )
  returning id into v_copy;

  v_pos := 0;
  if v_format = 'audiobook' then
    for v_name in select btrim(x) from jsonb_array_elements_text(coalesce(p_copy -> 'narrators', '[]'::jsonb)) as x loop
      continue when coalesce(v_name, '') = '';
      select id into v_person from public.people where lower(name) = lower(v_name);
      if v_person is null then
        insert into public.people (name) values (v_name) returning id into v_person;
      end if;
      v_pos := v_pos + 1;
      insert into public.credits (person_id, role, position, copy_id)
      values (v_person, 'narrator', v_pos, v_copy)
      on conflict do nothing;
    end loop;
  end if;

  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  select 'copies', v_copy, f, 'alexandra', true
  from unnest(array['format', 'isbn13', 'publisher', 'pages', 'cover_url', 'on_loan_to', 'narrators']) as f;

  return v_title;
end;
$$;

revoke execute on function public.add_book(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.add_book(uuid, jsonb, jsonb) to authenticated;
