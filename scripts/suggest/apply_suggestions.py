#!/usr/bin/env python3
"""Saves a batch of Claude's classification suggestions (Phase 2, step 5,
"Option A": done in Claude Code sessions, no API cost).

Usage:
  python3 -I scripts/suggest/apply_suggestions.py BATCH.json [--dry-run]

BATCH.json is a list of books:
  {"id" or "title": ...,
   "genre": [...], "subgenre": [...], "supernatural_being": [...], "shifter_type": [...],
   "queer_romance_type": [...], "retelling_type": [...], "trope": [...], "subject": [...],
   "gn_style": [...], "manga_demographic": [...], "franchise": [...],
   "audience": "adult", "vibe": ["dramatic", "cozy"], "romantic_subplot": true,
   "spice": "red_pepper_2", "story_focus": "balanced"}

Every value must be on Alexandra's approved lists (docs/starter-lists.md).
Rules, enforced in the SQL:
  * saved with source "claude", confirmed false, so they wait in To check;
  * books she classified herself are skipped, and so is anything she set,
    confirmed or rejected (rejected list values are field_sources "tag:<id>");
  * a deeper value (subgenre → supernatural being → shifter type) is added
    only when its parent is on the book;
  * spice and story focus only on books with Romance or a romantic subplot.
Needs SUPABASE_ACCESS_TOKEN (from .env.supabase) in the environment.
"""
import json
import os
import sys
import urllib.error
import urllib.request

PROJECT = "hfykwgjzmmcwmsqmfwnt"
LEVEL = {
    "genre": 1,
    "subgenre": 2, "trope": 2, "subject": 2, "reason": 2, "gn_style": 2, "manga_demographic": 2, "franchise": 2,
    "supernatural_being": 3, "queer_romance_type": 3, "retelling_type": 3,
    "shifter_type": 4,
}
ENUMS = {
    "audience": {"adult", "young_adult", "middle_grade", "childrens"},
    "spice": {"green_pepper", "yellow_pepper", "orange_pepper", "red_pepper_1", "red_pepper_2",
              "red_pepper_3", "red_pepper_4", "red_pepper_5"},
    "story_focus": {"plot_led", "balanced", "spice_led"},
    "vibe": {"cozy", "light", "dramatic", "intense"},
}


def query(sql):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"],
                 "Content-Type": "application/json", "User-Agent": "home-library-admin"},
    )
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"Database said: {e.read().decode()[:800]}")


def lit(s):
    return "'" + str(s).replace("'", "''") + "'"


def main():
    path, dry = sys.argv[1], "--dry-run" in sys.argv
    books = json.load(open(path))

    titles = {r["title"]: r["id"] for r in query(
        "select t.id, t.title from titles t where exists (select 1 from copies c where c.title_id = t.id and c.gone_at is null)")}
    ids = {}
    for b in books:
        tid = b.get("id") or titles.get(b.get("title"))
        if not tid:
            sys.exit(f"No owned book titled {b.get('title')!r}")
        ids[id(b)] = tid

    tag_rows, field_rows = [], []
    for b in books:
        tid = ids[id(b)]
        for kind, level in LEVEL.items():
            for name in b.get(kind, []):
                tag_rows.append(f"({lit(tid)}::uuid, {lit(kind)}, {lit(name)}, {level})")
        for field in ("audience", "spice", "story_focus"):
            if b.get(field) is not None:
                if b[field] not in ENUMS[field]:
                    sys.exit(f"{b.get('title')}: {field} {b[field]!r} isn't on the list")
                field_rows.append(f"({lit(tid)}::uuid, {lit(field)}, {lit(b[field])}, null)")
        if b.get("vibe"):
            v = b["vibe"] + [None]
            if any(x not in ENUMS["vibe"] for x in b["vibe"]):
                sys.exit(f"{b.get('title')}: vibe {b['vibe']} isn't on the list")
            field_rows.append(f"({lit(tid)}::uuid, 'vibe', {lit(v[0])}, {lit(v[1]) if v[1] else 'null'})")
        if b.get("romantic_subplot") is not None:
            field_rows.append(f"({lit(tid)}::uuid, 'romantic_subplot', {lit(str(bool(b['romantic_subplot'])).lower())}, null)")

    owner = "(select id from auth.users)"
    tag_insert = lambda level: f"""
insert into public.title_tags (owner_id, title_id, tag_id, source, confirmed)
select {owner}, s.title_id, g.id, 'claude', false
from sug s join public.tags g on g.kind::text = s.kind and g.name = s.name
where s.lvl = {level}
  and not exists (select 1 from public.title_tags x where x.title_id = s.title_id and x.tag_id = g.id)
  and not exists (select 1 from public.field_sources f where f.entity_id = s.title_id and f.field = 'tag:' || g.id)
  and (not exists (select 1 from public.tag_parents p where p.tag_id = g.id)
       or exists (select 1 from public.tag_parents p join public.title_tags x on x.tag_id = p.parent_id
                  where p.tag_id = g.id and x.title_id = s.title_id))
on conflict do nothing;"""

    def field_update(field, assign, empty):
        return f"""
with u as (
  update public.titles t set {assign}
  from sugf s
  where s.field = '{field}' and t.id = s.title_id and {empty}
    and not exists (select 1 from public.field_sources f
                    where f.entity_table = 'titles' and f.entity_id = t.id and f.field = '{field}' and f.source = 'alexandra')
  returning t.id)
insert into public.field_sources (owner_id, entity_table, entity_id, field, source, confirmed)
select {owner}, 'titles', id, '{field}', 'claude', false from u
on conflict (entity_table, entity_id, field) do update set source = 'claude', confirmed = false
  where public.field_sources.source <> 'alexandra';"""

    romance = """(t.romantic_subplot is true or exists (
      select 1 from public.title_tags x join public.tags g on g.id = x.tag_id
      where x.title_id = t.id and g.kind = 'genre' and g.name = 'Romance'))"""

    sql = f"""
begin;
create temp table sug (title_id uuid, kind text, name text, lvl int) on commit drop;
create temp table sugf (title_id uuid, field text, v1 text, v2 text) on commit drop;
{"insert into sug values " + ",".join(tag_rows) + ";" if tag_rows else ""}
{"insert into sugf values " + ",".join(field_rows) + ";" if field_rows else ""}
-- Books she classified herself are hers.
delete from sug where title_id in (select entity_id from public.field_sources where field = 'classification' and source = 'alexandra');
delete from sugf where title_id in (select entity_id from public.field_sources where field = 'classification' and source = 'alexandra');
create temp table missing on commit drop as
  select s.kind, s.name from sug s left join public.tags g on g.kind::text = s.kind and g.name = s.name where g.id is null;
{tag_insert(1)}{tag_insert(2)}{tag_insert(3)}{tag_insert(4)}
{field_update("audience", "audience = s.v1::public.audience", "t.audience is null")}
{field_update("romantic_subplot", "romantic_subplot = s.v1::boolean", "t.romantic_subplot is null")}
{field_update("vibe", "vibe_main = s.v1::public.vibe, vibe_second = s.v2::public.vibe", "t.vibe_main is null")}
{field_update("spice", "spice = s.v1::public.spice_level", "t.spice is null and " + romance)}
{field_update("story_focus", "story_focus = s.v1::public.story_focus", "t.story_focus is null and " + romance)}
create temp table summary on commit drop as
  select 'tag:' || g.kind::text as what, count(*)::int as n
  from public.title_tags tt join public.tags g on g.id = tt.tag_id
  where tt.source = 'claude' and tt.created_at = now() group by 1
  union all
  select 'field:' || field, count(*)::int from public.field_sources
  where source = 'claude' and updated_at = now() group by 1
  union all
  select 'missing:' || kind || ':' || name, 1 from missing;
{"rollback" if dry else "commit"};
"""
    # The query endpoint returns the last statement's result, so read the
    # summary in the same call before the transaction ends.
    sql = sql.replace(f'{"rollback" if dry else "commit"};', f'select * from summary order by 1;\n{"rollback" if dry else "commit"};')
    rows = query(sql)
    print(("DRY RUN (nothing saved)\n" if dry else "") + json.dumps(rows, indent=1))


if __name__ == "__main__":
    main()
