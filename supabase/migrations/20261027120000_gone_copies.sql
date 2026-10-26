-- Copies Alexandra no longer owns move to a "Gone" list instead of being
-- deleted. A book with no owned copies left drops out of the library, the
-- lookup and stats, but can be brought back with Undo.

create type public.gone_reason as enum ('sold', 'donated', 'gave_away', 'lost', 'other');

alter table public.copies
  add column gone_at timestamptz,
  add column gone_reason public.gone_reason,
  add constraint copies_gone_reason_check check ((gone_at is null) = (gone_reason is null));

create index copies_gone_idx on public.copies (owner_id) where gone_at is not null;

-- Deletes a copy that was added by mistake (it was never hers). If it was
-- the book's last copy, owned or gone, the book goes too. Returns the cover
-- photo path, if any, so the app can remove it from storage, and whether the
-- book itself was deleted.
create function public.delete_copy(p_copy_id uuid)
returns table (cover_path text, title_deleted boolean)
language plpgsql security invoker set search_path = '' as $$
declare
  v_title uuid;
  v_path text;
begin
  delete from public.copies c where c.id = p_copy_id returning c.title_id, c.cover_path into v_title, v_path;
  if v_title is null then
    raise exception 'That copy wasn''t found.';
  end if;
  delete from public.field_sources where entity_table = 'copies' and entity_id = p_copy_id;
  if not exists (select 1 from public.copies where title_id = v_title) then
    delete from public.titles where id = v_title;
    return query select v_path, true;
  else
    return query select v_path, false;
  end if;
end;
$$;

revoke execute on function public.delete_copy(uuid) from public, anon;
grant execute on function public.delete_copy(uuid) to authenticated;
