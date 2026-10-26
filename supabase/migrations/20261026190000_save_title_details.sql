-- Saves a book's own details (title, subtitle, book type, series, people and
-- audiobook narrators) in one go: either everything is saved or nothing is.
-- Runs as the signed-in user, so Row Level Security still applies, and marks
-- every value as set by Alexandra so no later prefill can overwrite it.

create function public.save_title_details(
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
    select id into v_person from public.people where lower(name) = lower(v_name);
    if v_person is null then
      insert into public.people (name) values (v_name) returning id into v_person;
    end if;
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
      select id into v_person from public.people where lower(name) = lower(v_name);
      if v_person is null then
        insert into public.people (name) values (v_name) returning id into v_person;
      end if;
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

revoke execute on function public.save_title_details(uuid, text, text, public.book_type, text, numeric, jsonb, jsonb, boolean)
  from public, anon;
grant execute on function public.save_title_details(uuid, text, text, public.book_type, text, numeric, jsonb, jsonb, boolean)
  to authenticated;
