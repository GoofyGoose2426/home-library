-- Needs review: Alexandra can say a flagged book is fine as it is (a
-- colouring book with no author, say). review_cleared lists the reasons she
-- cleared, so the ⚑ flag stops showing for them. "Title or author is a
-- guess" is cleared by turning off needs_check, as Edit details already does.

alter table public.titles
  add column review_cleared text[] not null default '{}'
  check (review_cleared <@ array['cover', 'author']::text[]);

-- p_reasons: what to clear ('cover', 'author', 'guess'). p_undo puts the
-- cover and author flags back.
create function public.clear_review(p_title_id uuid, p_reasons text[], p_undo boolean default false)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not (p_reasons <@ array['cover', 'author', 'guess']::text[]) then
    raise exception 'That isn''t something to review.';
  end if;
  if not exists (select 1 from public.titles where id = p_title_id) then
    raise exception 'That book wasn''t found.';
  end if;
  update public.titles set
    review_cleared = case
      when p_undo then array(select r from unnest(review_cleared) r where r <> all (p_reasons))
      else array(select distinct r from unnest(review_cleared || p_reasons) r where r in ('cover', 'author') order by r)
    end,
    needs_check = case when 'guess' = any (p_reasons) and not p_undo then false else needs_check end
  where id = p_title_id;
end;
$$;

revoke execute on function public.clear_review(uuid, text[], boolean) from public, anon;
grant execute on function public.clear_review(uuid, text[], boolean) to authenticated;
