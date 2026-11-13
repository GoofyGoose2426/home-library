-- Ask your library (Phase 3, step 5): a pinned report holds only a read-only
-- lookup in the shape the app knows how to run (src/lib/ask.ts parseLookup,
-- which checks every value). This is a second guard: no other keys, and only
-- the four kinds of answer (count, group, average, list).
alter table public.saved_reports
  add constraint saved_reports_lookup_check check (
    jsonb_typeof(spec) = 'object'
    and spec ->> 'v' = '1'
    and (spec - array['v', 'status', 'where', 'leftOut', 'show']::text[]) = '{}'::jsonb
    and jsonb_typeof(spec -> 'show') = 'object'
    and spec -> 'show' ->> 'kind' in ('count', 'group', 'average', 'list')
    and ((spec -> 'show') - array['kind', 'by', 'of', 'sort', 'limit']::text[]) = '{}'::jsonb
    and (spec -> 'status' is null or jsonb_typeof(spec -> 'status') = 'array')
    and (spec -> 'where' is null or jsonb_typeof(spec -> 'where') = 'array')
    and (spec -> 'leftOut' is null or jsonb_typeof(spec -> 'leftOut') = 'boolean')
  ),
  add constraint saved_reports_chart_type_check check (chart_type in ('sentence', 'bars', 'table')),
  add constraint saved_reports_name_length check (char_length(name) <= 120),
  add constraint saved_reports_question_length check (question is null or char_length(question) <= 1000);
