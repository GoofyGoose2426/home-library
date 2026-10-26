-- Phase 2, step 2: classification on the book page.
--
-- Lists (docs/starter-lists.md) are tags. Some go a level or two deeper:
-- a tag with parents is offered only when the book has one of its parents
-- (Shifters → shifter type; Queer romance → Sapphic/Achillean/Poly). Parents
-- live in tag_parents. The rough genres from the shelf photos become kind
-- 'rough_genre': kept for reference until Alexandra sets real genres.

alter type public.tag_kind add value 'supernatural_being';
alter type public.tag_kind add value 'shifter_type';
alter type public.tag_kind add value 'queer_romance_type';
alter type public.tag_kind add value 'retelling_type';
alter type public.tag_kind add value 'rough_genre';

create type public.audience as enum ('adult', 'young_adult', 'middle_grade', 'childrens');
alter table public.titles add column audience public.audience;

create table public.tag_parents (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  parent_id uuid not null references public.tags on delete cascade,
  primary key (tag_id, parent_id),
  check (tag_id <> parent_id)
);
create index tag_parents_owner_idx on public.tag_parents (owner_id);
create index tag_parents_parent_idx on public.tag_parents (parent_id);

alter table public.tag_parents enable row level security;
create policy owner_only on public.tag_parents
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
revoke all on public.tag_parents from anon;

-- Saves everything in the classification editor at once. All or nothing,
-- as the signed-in user, so Row Level Security applies.
--   p_tag_ids:  every list value chosen (all kinds except rough_genre)
--   p_new_tags: values she typed that aren't in a list yet: [{ kind, name, parent_ids }]
--   p_fields:   { audience, romantic_subplot, spice, story_focus, vibe_main, vibe_second }
-- Values whose parent isn't chosen are dropped (untick Shifters and its
-- shifter types go too). Spice and story focus need romance: a Romance genre
-- or a romantic subplot. Everything saved is marked as Alexandra's.
create function public.save_classification(p_title_id uuid, p_tag_ids uuid[], p_new_tags jsonb, p_fields jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_ids uuid[] := coalesce(p_tag_ids, '{}');
  v_tag uuid;
  v_kind public.tag_kind;
  v_name text;
  v_before int;
  v_romance boolean;
  n jsonb;
begin
  if not exists (select 1 from public.titles where id = p_title_id) then
    raise exception 'That book wasn''t found.';
  end if;
  if exists (select 1 from public.tags where id = any(v_ids) and kind = 'rough_genre')
     or (select count(*) from public.tags where id = any(v_ids)) <> cardinality(array(select distinct unnest(v_ids))) then
    raise exception 'One of those choices wasn''t found.';
  end if;

  for n in select * from jsonb_array_elements(coalesce(p_new_tags, '[]'::jsonb)) loop
    v_kind := (n ->> 'kind')::public.tag_kind;
    v_name := btrim(n ->> 'name');
    if v_kind = 'rough_genre' or coalesce(v_name, '') = '' or length(v_name) > 80 then
      raise exception 'New list values need a name (80 characters at most).';
    end if;
    select id into v_tag from public.tags where kind = v_kind and lower(name) = lower(v_name);
    if v_tag is null then
      insert into public.tags (kind, name) values (v_kind, v_name) returning id into v_tag;
      insert into public.tag_parents (tag_id, parent_id)
      select v_tag, p.id from public.tags p
      where p.id in (select (jsonb_array_elements_text(coalesce(n -> 'parent_ids', '[]'::jsonb)))::uuid)
      on conflict do nothing;
    end if;
    v_ids := array_append(v_ids, v_tag);
  end loop;

  -- Drop values whose parents aren't chosen, until nothing changes
  -- (three levels at most: subgenre → being → shifter type).
  loop
    v_before := cardinality(v_ids);
    v_ids := array(
      select distinct t from unnest(v_ids) t
      where not exists (select 1 from public.tag_parents tp where tp.tag_id = t)
         or exists (select 1 from public.tag_parents tp where tp.tag_id = t and tp.parent_id = any(v_ids))
    );
    exit when cardinality(v_ids) = v_before;
  end loop;

  delete from public.title_tags tt
  using public.tags g
  where tt.tag_id = g.id and tt.title_id = p_title_id
    and (g.kind <> 'rough_genre' and not (g.id = any(v_ids))
         -- Once she sets real genres, the rough one from the photos goes.
         or g.kind = 'rough_genre' and exists (select 1 from public.tags x where x.id = any(v_ids) and x.kind = 'genre'));
  insert into public.title_tags (title_id, tag_id, source, confirmed, is_primary)
  select p_title_id, t, 'alexandra', true, false from unnest(v_ids) t
  on conflict (title_id, tag_id) do update set source = 'alexandra', confirmed = true;

  v_romance := exists (select 1 from public.tags where id = any(v_ids) and kind = 'genre' and lower(name) = 'romance')
               or coalesce((p_fields ->> 'romantic_subplot')::boolean, false);
  update public.titles set
    audience = nullif(p_fields ->> 'audience', '')::public.audience,
    romantic_subplot = (p_fields ->> 'romantic_subplot')::boolean,
    spice = case when v_romance then nullif(p_fields ->> 'spice', '')::public.spice_level end,
    story_focus = case when v_romance then nullif(p_fields ->> 'story_focus', '')::public.story_focus end,
    vibe_main = nullif(p_fields ->> 'vibe_main', '')::public.vibe,
    vibe_second = case when nullif(p_fields ->> 'vibe_main', '') is not null
                       and p_fields ->> 'vibe_second' is distinct from p_fields ->> 'vibe_main'
                       then nullif(p_fields ->> 'vibe_second', '')::public.vibe end
  where id = p_title_id;

  insert into public.field_sources (entity_table, entity_id, field, source, confirmed)
  select 'titles', p_title_id, f, 'alexandra', true
  from unnest(array['classification', 'audience', 'romantic_subplot', 'spice', 'story_focus', 'vibe']) as f
  on conflict (entity_table, entity_id, field) do update set source = 'alexandra', confirmed = true;
end;
$$;

revoke execute on function public.save_classification(uuid, uuid[], jsonb, jsonb) from public, anon;
grant execute on function public.save_classification(uuid, uuid[], jsonb, jsonb) to authenticated;
