"""Merge an author listed twice under two spellings into one.

Usage: python3 -I scripts/represent/merge_people.py "Keep Name=Drop Name" [...] [--dry-run]

Moves the dropped person's credits, identity values and field_sources onto
the kept person, then deletes the dropped person. A credit or value the kept
person already has is not duplicated. Safe to re-run: once the dropped name is
gone, there is nothing left to merge.
"""

import json
import os
import sys
import urllib.error
import urllib.request

REF = "hfykwgjzmmcwmsqmfwnt"


def query(sql):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"],
            "Content-Type": "application/json",
            "User-Agent": "home-library-admin",
        },
    )
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(e.read().decode())


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def merge_sql(keep, drop):
    k = f"(select id from public.people where name = {lit(keep)})"
    d = f"(select id from public.people where name = {lit(drop)})"
    return f"""
    update public.credits c set person_id = {k}
      where c.person_id = {d}
        and not exists (select 1 from public.credits x where x.person_id = {k} and x.role = c.role
          and x.title_id is not distinct from c.title_id and x.piece_id is not distinct from c.piece_id
          and x.copy_id is not distinct from c.copy_id);
    delete from public.credits where person_id = {d};
    update public.author_identities a set person_id = {k}
      where a.person_id = {d}
        and not exists (select 1 from public.author_identities x where x.person_id = {k}
          and x.category = a.category and lower(x.value) = lower(a.value));
    update public.field_sources f set entity_id = {k}
      where f.entity_table = 'people' and f.entity_id = {d}
        and not exists (select 1 from public.field_sources x where x.entity_table = 'people'
          and x.entity_id = {k} and x.field = f.field);
    update public.people set identity_checked_at = greatest(identity_checked_at,
        (select identity_checked_at from public.people where name = {lit(drop)}))
      where name = {lit(keep)};
    delete from public.field_sources where entity_table = 'people' and entity_id = {d};
    delete from public.people where name = {lit(drop)};
    """


def main():
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv
    pairs = [a.split("=", 1) for a in args]
    if not pairs or any(len(p) != 2 for p in pairs):
        sys.exit(__doc__)
    names = [n for p in pairs for n in p]
    found = {r["name"]: r for r in query(f"""
      select p.name, (select count(*) from public.credits c where c.person_id = p.id) credits,
        (select count(*) from public.author_identities a where a.person_id = p.id) ids
      from public.people p where p.name in ({', '.join(lit(n) for n in names)})""")}
    todo = []
    for keep, drop in pairs:
        if keep not in found:
            sys.exit(f"Not found: {keep}")
        if drop not in found:
            print(f"{drop}: already merged")
            continue
        f = found[drop]
        print(f"{drop} → {keep}: {f['credits']} credits, {f['ids']} identity values")
        todo.append(merge_sql(keep, drop))
    if dry or not todo:
        print("Dry run. Nothing saved." if dry else "Nothing to do.")
        return
    query("begin;" + "".join(todo) + "commit;")
    print("Merged.")


main()
