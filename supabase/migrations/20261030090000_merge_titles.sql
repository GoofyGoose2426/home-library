-- Merges a duplicate entry into another, so each book is one entry with all
-- its copies (rule 4). The kept entry's details win; anything only the other
-- entry had is carried over. Then the duplicate is deleted. All or nothing,
-- as the signed-in user.

create function public.merge_titles(p_keep uuid, p_merge uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  k public.titles%rowtype;
  m public.titles%rowtype;
  v_keep_review uuid;
  v_merge_review uuid;
  v_take text[];
begin
  if p_keep = p_merge then
    raise exception 'Pick two different books.';
  end if;
  select * into k from public.titles where id = p_keep for update;
  select * into m from public.titles where id = p_merge for update;
  if k.id is null or m.id is null then
    raise exception 'That book wasn''t found.';
  end if;

  -- Copies (with their narrators, covers and copy reviews) move as they are.
  update public.copies set title_id = p_keep where title_id = p_merge;

  -- Credits, genres, tags and representation: add what's missing.
  insert into public.credits (owner_id, person_id, role, position, title_id)
  select c.owner_id, c.person_id, c.role,
         (select coalesce(max(position), 0) from public.credits where title_id = p_keep) + row_number() over (order by c.position),
         p_keep
  from public.credits c
  where c.title_id = p_merge
    and not exists (select 1 from public.credits x where x.title_id = p_keep and x.person_id = c.person_id and x.role = c.role);
  delete from public.credits where title_id = p_merge;

  insert into public.title_tags (owner_id, title_id, tag_id, is_primary, source, confirmed)
  select owner_id, p_keep, tag_id, is_primary, source, confirmed from public.title_tags where title_id = p_merge
  on conflict (title_id, tag_id) do update
    set source = case when excluded.source = 'alexandra' then 'alexandra' else public.title_tags.source end,
        confirmed = public.title_tags.confirmed or excluded.confirmed;
  delete from public.title_tags where title_id = p_merge;

  update public.character_representations set title_id = p_keep where title_id = p_merge;
  update public.import_items set matched_title_id = p_keep where matched_title_id = p_merge;

  -- Pieces (stories in a collection) come over only if the kept entry has none.
  if not exists (select 1 from public.pieces where title_id = p_keep) then
    update public.pieces set title_id = p_keep where title_id = p_merge;
  end if;

  -- One review per book: the kept one, filled in from the other where it's empty.
  select id into v_keep_review from public.reviews where title_id = p_keep;
  select id into v_merge_review from public.reviews where title_id = p_merge;
  if v_merge_review is not null and v_keep_review is null then
    update public.reviews set title_id = p_keep where id = v_merge_review;
  elsif v_merge_review is not null then
    update public.reviews r set
      rating = coalesce(r.rating, o.rating),
      writing_quality = case when coalesce(r.rating, o.rating) is null then null else coalesce(r.writing_quality, o.writing_quality) end,
      recommendation = case when coalesce(r.rating, o.rating) is null then null else coalesce(r.recommendation, o.recommendation) end,
      body = coalesce(r.body, o.body)
    from public.reviews o
    where r.id = v_keep_review and o.id = v_merge_review;
  end if;

  -- Book details: ours win. A detail only the other entry has comes over,
  -- with its source, unless she cleared it on ours herself.
  v_take := array(
    select f from (values
      ('subtitle', k.subtitle is null and m.subtitle is not null),
      ('series', k.series_id is null and m.series_id is not null),
      ('description', k.description is null and m.description is not null),
      ('audience', k.audience is null and m.audience is not null),
      ('romantic_subplot', k.romantic_subplot is null and m.romantic_subplot is not null),
      ('spice', k.spice is null and m.spice is not null),
      ('story_focus', k.story_focus is null and m.story_focus is not null),
      ('vibe', k.vibe_main is null and m.vibe_main is not null),
      ('first_published', k.first_published is null and m.first_published is not null),
      ('typical_pages', k.typical_pages is null and m.typical_pages is not null)
    ) as v(f, gap)
    where gap and not exists (
      select 1 from public.field_sources fs
      where fs.entity_table = 'titles' and fs.entity_id = p_keep and fs.field = v.f and fs.source = 'alexandra'));

  update public.titles set
    subtitle = case when 'subtitle' = any(v_take) then m.subtitle else k.subtitle end,
    series_id = case when 'series' = any(v_take) then m.series_id else k.series_id end,
    series_number = case when 'series' = any(v_take) then m.series_number else k.series_number end,
    description = case when 'description' = any(v_take) then m.description else k.description end,
    audience = case when 'audience' = any(v_take) then m.audience else k.audience end,
    romantic_subplot = case when 'romantic_subplot' = any(v_take) then m.romantic_subplot else k.romantic_subplot end,
    spice = case when 'spice' = any(v_take) then m.spice else k.spice end,
    story_focus = case when 'story_focus' = any(v_take) then m.story_focus else k.story_focus end,
    vibe_main = case when 'vibe' = any(v_take) then m.vibe_main else k.vibe_main end,
    vibe_second = case when 'vibe' = any(v_take) then m.vibe_second else k.vibe_second end,
    first_published = case when 'first_published' = any(v_take) then m.first_published else k.first_published end,
    typical_pages = case when 'typical_pages' = any(v_take) then m.typical_pages else k.typical_pages end,
    own_voices = coalesce(k.own_voices, m.own_voices),
    openlibrary_key = coalesce(k.openlibrary_key, m.openlibrary_key),
    is_reference = k.is_reference or m.is_reference,
    -- Read in either entry means read.
    read_status = case
      when 'read' in (k.read_status, m.read_status) then 'read'::public.read_status
      when 'partly_read' in (k.read_status, m.read_status) then 'partly_read'::public.read_status
      else 'unread'::public.read_status end
  where id = p_keep;

  -- Sources follow the values: for details that came over, the other
  -- entry's source replaces ours; fields only they recorded come too.
  delete from public.field_sources
  where entity_table = 'titles' and entity_id = p_keep and field = any(v_take)
    and exists (select 1 from public.field_sources o where o.entity_table = 'titles' and o.entity_id = p_merge and o.field = field_sources.field);
  update public.field_sources fs set entity_id = p_keep
  where fs.entity_table = 'titles' and fs.entity_id = p_merge
    and (fs.field = any(v_take)
         or not exists (select 1 from public.field_sources x where x.entity_table = 'titles' and x.entity_id = p_keep and x.field = fs.field));
  delete from public.field_sources where entity_table = 'titles' and entity_id = p_merge;

  delete from public.titles where id = p_merge;
end;
$$;

revoke execute on function public.merge_titles(uuid, uuid) from public, anon;
grant execute on function public.merge_titles(uuid, uuid) to authenticated;
