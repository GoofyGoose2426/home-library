-- Phase 2, step 7: add a book, smarter.
--
-- 1. People are matched ignoring spaces, dots and capitals, so "T. J. Klune",
--    "TJ Klune" and "tj klune" are one person (the first one wins).
-- 2. add_book can also save details looked up on Open Library and Google
--    Books (description, year, typical length, series, publisher, pages,
--    word estimate). She saw them in the form before saving, so they're
--    confirmed, with the service they came from kept as the source.

create function public.person_key(p_name text)
returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(lower(coalesce(p_name, '')), '[^[:alnum:]]+', '', 'g');
$$;

create index people_person_key on public.people (owner_id, public.person_key(name));

-- The existing person with this name (spelled any way), or a new one.
create function public.find_or_add_person(p_name text)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_person uuid;
begin
  select id into v_person from public.people
  where public.person_key(name) = public.person_key(p_name)
  order by (lower(name) = lower(p_name)) desc, created_at, id
  limit 1;
  if v_person is null then
    insert into public.people (name) values (btrim(p_name)) returning id into v_person;
  end if;
  return v_person;
end;
$$;

revoke execute on function public.person_key(text) from public, anon;
revoke execute on function public.find_or_add_person(text) from public, anon;
grant execute on function public.person_key(text) to authenticated;
grant execute on function public.find_or_add_person(text) to authenticated;

-- p_book:  { title, subtitle, book_type, read_status, series, series_number,
--            credits: [{ name, role }],
--            description, first_published, typical_pages, openlibrary_key, looked_up,
--            sources: { series, description, first_published, typical_pages } }
-- p_copy:  { format, source, isbn13, publisher, pages, est_words, cover_url, on_loan_to,
--            narrators: [name], sources: { publisher, pages, est_words } }
-- A missing source means Alexandra typed it.
create or replace function public.add_book(p_title_id uuid, p_book jsonb, p_copy jsonb)
returns uuid
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
  v_description text := left(nullif(btrim(p_book ->> 'description'), ''), 5000);
  v_year smallint := nullif(p_book ->> 'first_published', '')::smallint;
  v_typical int := nullif(p_book ->> 'typical_pages', '')::int;
  v_words int := nullif(p_copy ->> 'est_words', '')::int;
  v_src text;
  c jsonb;
begin
  if v_cover is not null and v_cover !~ '^https://covers\.openlibrary\.org/b/id/[0-9]+-[SML]\.jpg$' then
    raise exception 'Covers can only come from Open Library here.';
  end if;
  if (v_format in ('ebook', 'audiobook')) = (v_source = 'shelf') then
    raise exception 'Print copies live on the bookshelf; ebooks and audiobooks live in an app.';
  end if;
  for v_src in
    select value from jsonb_each_text(coalesce(p_book -> 'sources', '{}'::jsonb))
    union all select value from jsonb_each_text(coalesce(p_copy -> 'sources', '{}'::jsonb))
  loop
    if v_src not in ('openlibrary', 'googlebooks', 'alexandra') then
      raise exception 'Unknown source.';
    end if;
  end loop;

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
    insert into public.titles (
      title, subtitle, book_type, read_status, series_id, series_number,
      description, first_published, typical_pages, openlibrary_key, details_checked_at
    )
    values (
      btrim(p_book ->> 'title'),
      nullif(btrim(p_book ->> 'subtitle'), ''),
      coalesce((p_book ->> 'book_type')::public.book_type, 'prose'),
      coalesce((p_book ->> 'read_status')::public.read_status, 'unread'),
      v_series,
      case when v_series is null then null else (p_book ->> 'series_number')::numeric end,
      v_description,
      v_year,
      v_typical,
      nullif(p_book ->> 'openlibrary_key', ''),
      case when (p_book ->> 'looked_up')::boolean then now() end
    )
    returning id into v_title;

    for c in select * from jsonb_array_elements(coalesce(p_book -> 'credits', '[]'::jsonb)) loop
      v_name := btrim(c ->> 'name');
      continue when coalesce(v_name, '') = '';
      if (c ->> 'role') = 'narrator' then
        raise exception 'Narrators belong on an audiobook copy.';
      end if;
      v_person := public.find_or_add_person(v_name);
      v_pos := v_pos + 1;
      insert into public.credits (person_id, role, position, title_id)
      values (v_person, (c ->> 'role')::public.credit_role, v_pos, v_title)
      on conflict do nothing;
    end loop;

    insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
    select 'titles', v_title, f, coalesce(p_book -> 'sources' ->> f, 'alexandra'), true
    from unnest(array['title', 'subtitle', 'authors', 'series', 'book_type', 'read_status']) as f;
    insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
    select 'titles', v_title, f, coalesce(p_book -> 'sources' ->> f, 'alexandra'), true
    from unnest(array['description', 'first_published', 'typical_pages']) as f
    where (f = 'description' and v_description is not null)
       or (f = 'first_published' and v_year is not null)
       or (f = 'typical_pages' and v_typical is not null);
  elsif not exists (select 1 from public.titles where id = v_title) then
    raise exception 'That book wasn''t found.';
  end if;

  insert into public.copies (title_id, format, source, isbn13, publisher, pages, est_words, cover_url, cover_confirmed, on_loan_to)
  values (
    v_title,
    v_format,
    v_source,
    nullif(regexp_replace(coalesce(p_copy ->> 'isbn13', ''), '[^0-9]', '', 'g'), ''),
    nullif(btrim(p_copy ->> 'publisher'), ''),
    nullif(p_copy ->> 'pages', '')::int,
    v_words,
    v_cover,
    v_cover is not null,
    case when v_source = 'shelf' then nullif(btrim(p_copy ->> 'on_loan_to'), '') end
  )
  returning id into v_copy;

  v_pos := 0;
  if v_format = 'audiobook' then
    for v_name in select btrim(x) from jsonb_array_elements_text(coalesce(p_copy -> 'narrators', '[]'::jsonb)) as x loop
      continue when coalesce(v_name, '') = '';
      v_person := public.find_or_add_person(v_name);
      v_pos := v_pos + 1;
      insert into public.credits (person_id, role, position, copy_id)
      values (v_person, 'narrator', v_pos, v_copy)
      on conflict do nothing;
    end loop;
  end if;

  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  select 'copies', v_copy, f, coalesce(p_copy -> 'sources' ->> f, 'alexandra'), true
  from unnest(array['format', 'isbn13', 'publisher', 'pages', 'cover_url', 'on_loan_to', 'narrators', 'est_words']) as f
  where f <> 'est_words' or v_words is not null;

  return v_title;
end;
$$;

create or replace function public.save_title_details(
  p_title_id uuid,
  p_title text,
  p_subtitle text,
  p_book_type public.book_type,
  p_series text,
  p_series_number numeric,
  p_credits jsonb,     -- [{ "name": "…", "role": "author" | "writer" | "artist" | "editor" | "translator" }]
  p_narrators jsonb,   -- [{ "copy_id": "…", "names": ["…"] }]
  p_clear_check boolean
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_series uuid;
  v_person uuid;
  v_name text;
  v_role public.credit_role;
  v_pos int := 0;
  c jsonb;
  n jsonb;
begin
  if not exists (select 1 from public.titles where id = p_title_id) then
    raise exception 'That book wasn''t found.';
  end if;
  if coalesce(btrim(p_title), '') = '' then
    raise exception 'A title is required.';
  end if;

  -- Series: reuse one with the same name (any capitalisation), or start one.
  if nullif(btrim(p_series), '') is not null then
    select id into v_series from public.series where lower(name) = lower(btrim(p_series));
    if v_series is null then
      insert into public.series (name) values (btrim(p_series)) returning id into v_series;
    end if;
  end if;

  update public.titles set
    title = btrim(p_title),
    subtitle = nullif(btrim(p_subtitle), ''),
    book_type = p_book_type,
    series_id = v_series,
    series_number = case when v_series is null then null else p_series_number end,
    needs_check = case when p_clear_check then false else needs_check end,
    check_note = case when p_clear_check then null else check_note end
  where id = p_title_id;

  -- People on the title, in the order given.
  delete from public.credits where title_id = p_title_id;
  for c in select * from jsonb_array_elements(coalesce(p_credits, '[]'::jsonb)) loop
    v_name := btrim(c ->> 'name');
    continue when coalesce(v_name, '') = '';
    v_role := (c ->> 'role')::public.credit_role;
    if v_role = 'narrator' then
      raise exception 'Narrators belong on an audiobook copy.';
    end if;
    v_person := public.find_or_add_person(v_name);
    v_pos := v_pos + 1;
    insert into public.credits (person_id, role, position, title_id)
    values (v_person, v_role, v_pos, p_title_id)
    on conflict do nothing;
  end loop;

  -- Narrators on this book's audiobook copies.
  for n in select * from jsonb_array_elements(coalesce(p_narrators, '[]'::jsonb)) loop
    if not exists (
      select 1 from public.copies
      where id = (n ->> 'copy_id')::uuid and title_id = p_title_id and format = 'audiobook'
    ) then
      raise exception 'Narrators can only go on this book''s audiobook copies.';
    end if;
    delete from public.credits where copy_id = (n ->> 'copy_id')::uuid and role = 'narrator';
    v_pos := 0;
    for v_name in select btrim(x) from jsonb_array_elements_text(coalesce(n -> 'names', '[]'::jsonb)) as x loop
      continue when coalesce(v_name, '') = '';
      v_person := public.find_or_add_person(v_name);
      v_pos := v_pos + 1;
      insert into public.credits (person_id, role, position, copy_id)
      values (v_person, 'narrator', v_pos, (n ->> 'copy_id')::uuid)
      on conflict do nothing;
    end loop;
    insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
    values ('copies', (n ->> 'copy_id')::uuid, 'narrators', 'alexandra', true)
    on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
  end loop;

  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  select 'titles', p_title_id, f, 'alexandra', true
  from unnest(array['title', 'subtitle', 'authors', 'series', 'book_type']) as f
  on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
end;
$$;

