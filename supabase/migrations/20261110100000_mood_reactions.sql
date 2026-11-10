-- Mood reactions: only values from Alexandra's approved list
-- (docs/starter-lists.md section 8, approved 2026-11-10). They're stored by
-- key; the app shows her wording. Keep in step with src/lib/moods.ts.

alter table public.reviews
  add constraint reviews_mood_reactions_check
  check (mood_reactions <@ array['laughed', 'swooned', 'cozy', 'hopeful', 'inspired', 'nostalgic', 'cried', 'heartbroken', 'fired_up', 'hot_bothered', 'page_turner', 'edge_of_seat', 'twist', 'scared', 'creeped_out', 'book_hangover', 'made_me_think', 'slow_burn', 'pacing', 'character', 'ending', 'confusing']::text[]);
