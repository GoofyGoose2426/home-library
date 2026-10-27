-- Series check: put a book in a series (or confirm it isn't in one), with its
-- number, and optionally tidy its title. Marked as Alexandra's, so the
-- book drops off the Series check list and no fill-in changes it.
create function public.set_series(p_title_id uuid, p_series text, p_number numeric, p_new_title text)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_series uuid;
begin
  if not exists (select 1 from public.titles where id = p_title_id) then
    raise exception 'That book wasn''t found.';
  end if;
  if nullif(btrim(p_series), '') is not null then
    select id into v_series from public.series where lower(name) = lower(btrim(p_series));
    if v_series is null then
      insert into public.series (name) values (btrim(p_series)) returning id into v_series;
    end if;
  end if;
  update public.titles set
    series_id = v_series,
    series_number = case when v_series is null then null else p_number end,
    title = coalesce(nullif(btrim(p_new_title), ''), title)
  where id = p_title_id;

  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  select 'titles', p_title_id, f, 'alexandra', true
  from unnest(case when nullif(btrim(p_new_title), '') is null then array['series'] else array['series', 'title'] end) as f
  on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
end;
$$;

revoke execute on function public.set_series(uuid, text, numeric, text) from public, anon;
grant execute on function public.set_series(uuid, text, numeric, text) to authenticated;
