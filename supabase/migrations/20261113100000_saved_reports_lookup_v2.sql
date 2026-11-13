-- Ask your library: two more read-only answer shapes (2026-11-13), for her
-- first five questions. A grouped answer can say what's inside each of its
-- top values (then, top), and "missing" shows which fields have the most
-- books with no value yet. Same rules as before otherwise.
alter table public.saved_reports drop constraint saved_reports_lookup_check;
alter table public.saved_reports
  add constraint saved_reports_lookup_check check (
    jsonb_typeof(spec) = 'object'
    and spec ->> 'v' = '1'
    and (spec - array['v', 'status', 'where', 'leftOut', 'show']::text[]) = '{}'::jsonb
    and jsonb_typeof(spec -> 'show') = 'object'
    and spec -> 'show' ->> 'kind' in ('count', 'group', 'average', 'list', 'missing')
    and ((spec -> 'show') - array['kind', 'by', 'of', 'sort', 'limit', 'then', 'top']::text[]) = '{}'::jsonb
    and (spec -> 'status' is null or jsonb_typeof(spec -> 'status') = 'array')
    and (spec -> 'where' is null or jsonb_typeof(spec -> 'where') = 'array')
    and (spec -> 'leftOut' is null or jsonb_typeof(spec -> 'leftOut') = 'boolean')
    and (spec -> 'show' -> 'then' is null or jsonb_typeof(spec -> 'show' -> 'then') = 'array')
    and (spec -> 'show' -> 'top' is null or jsonb_typeof(spec -> 'show' -> 'top') = 'number')
  );
