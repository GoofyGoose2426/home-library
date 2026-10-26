-- Alexandra's rating scales (rating-scales.xlsx, v2):
--   stars 1.00–5.00 in quarter steps (the main rating),
--   writing quality 1–5 and "would I recommend it?" (optional, need stars),
--   audio performance 1–5 on audiobook copies, with the review text as its note.
-- The free-text "who I'd recommend it to" is replaced by the recommendation.

create type public.recommendation as enum ('no', 'everyone', 'specific');

alter table public.reviews
  drop constraint reviews_rating_check,
  add constraint reviews_rating_check check (rating between 1 and 5 and rating * 4 = trunc(rating * 4)),
  drop column recommend_to,
  add column writing_quality smallint check (writing_quality between 1 and 5),
  add column recommendation public.recommendation,
  add column audio_performance smallint check (audio_performance between 1 and 5),
  -- Writing quality and the recommendation go with a star rating.
  add constraint reviews_extras_need_stars check (rating is not null or (writing_quality is null and recommendation is null)),
  add constraint reviews_audio_on_copies check (audio_performance is null or copy_id is not null);

-- Audio performance only makes sense for an audiobook copy.
create function public.reviews_audio_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.audio_performance is not null
     and not exists (select 1 from public.copies where id = new.copy_id and format = 'audiobook') then
    raise exception 'Audio performance is only for audiobook copies.';
  end if;
  return new;
end;
$$;

create trigger reviews_audio_only before insert or update on public.reviews
  for each row execute function public.reviews_audio_only();
