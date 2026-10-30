#!/usr/bin/env python3
"""Saves a batch of author identity and character representation lookups
(Phase 2, step 6, done in Claude Code sessions; docs/author-representation-plan.md).

Usage:
  python3 -I scripts/represent/apply_identities.py BATCH.json [--dry-run]

BATCH.json:
  {"authors": [{"name": "Octavia E. Butler",
                "values": [{"category": "race_ethnicity", "value": "Black American",
                            "url": "https://…", "quote": "the author's own words"}]}],
   "characters": [{"title": "Kindred",
                   "values": [{"category": "race_ethnicity", "value": "Black American",
                               "character": "Dana", "url": "https://…", "quote": "the publisher's words"}]}]}

Every author listed is marked as looked up today, even with no values
(nothing public found means the categories stay unknown).

Rules, enforced here and in the database:
  * author values need the author's OWN words: a link and a quote, always;
  * character values need a link and the line from publisher text or a
    community representation list;
  * saved with source "claude", confirmed false, so they wait in To check;
  * a value Alexandra rejected is never added back, and a category she set
    herself is left alone;
  * own voices is suggested (unconfirmed) when an author and the book's main
    character share an identity, unless she has set it.
Needs SUPABASE_ACCESS_TOKEN (from .env.supabase) in the environment.
"""
import json
import os
import sys
import urllib.error
import urllib.request

PROJECT = "hfykwgjzmmcwmsqmfwnt"
CATEGORIES = {"gender_identity", "lgbtqia", "race_ethnicity", "disability", "neurodivergence", "nationality_region"}
PICKS = {
    "gender_identity": {"Woman", "Man", "Non-binary", "Genderfluid", "Agender", "Two-Spirit"},
    "lgbtqia": {"Lesbian", "Gay", "Bisexual", "Pansexual", "Queer", "Asexual", "Aromantic", "Trans", "Intersex", "Two-Spirit"},
    "neurodivergence": {"Autistic", "ADHD", "Dyslexic", "Dyspraxic"},
}
# Gender alone isn't own voices (a woman writing a woman); these are.
OWN_VOICES = {"lgbtqia", "race_ethnicity", "disability", "neurodivergence"}


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
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def check_value(who, v, need_quote=True):
    if v.get("category") not in CATEGORIES:
        sys.exit(f"{who}: unknown category {v.get('category')!r}")
    value = (v.get("value") or "").strip()
    if not value:
        sys.exit(f"{who}: empty value")
    picks = PICKS.get(v["category"])
    if picks and value not in picks and not v.get("other"):
        sys.exit(f"{who}: {value!r} isn't on the {v['category']} list (add \"other\": true for the author's own word)")
    if not str(v.get("url", "")).startswith(("https://", "http://")):
        sys.exit(f"{who}: {value!r} needs a link")
    if need_quote and not (v.get("quote") or "").strip():
        sys.exit(f"{who}: {value!r} needs the words that say it")
    return value


def counts_for_own_voices(category, value):
    return category in OWN_VOICES or (category == "gender_identity" and value.lower() not in ("woman", "man"))


def main():
    path, dry = sys.argv[1], "--dry-run" in sys.argv
    batch = json.load(open(path))

    people = {}
    for r in query("select id, name from people"):
        people.setdefault(r["name"].lower(), []).append(r["id"])
    titles = {}
    for r in query("select t.id, t.title from titles t where exists "
                   "(select 1 from copies c where c.title_id = t.id and c.gone_at is null)"):
        titles.setdefault(r["title"].lower(), []).append(r["id"])

    author_rows, person_ids = [], []
    for a in batch.get("authors", []):
        found = [a["id"]] if a.get("id") else people.get(a["name"].lower(), [])
        if len(found) != 1:
            sys.exit(f"{a['name']!r}: {'no' if not found else 'more than one'} author by that name")
        pid = found[0]
        person_ids.append(pid)
        for v in a.get("values", []):
            value = check_value(a["name"], v)
            author_rows.append(f"({lit(pid)}::uuid, {lit(v['category'])}, {lit(value)}, {lit(v['url'])}, {lit(v['quote'].strip()[:600])})")

    char_rows, title_ids = [], []
    for c in batch.get("characters", []):
        found = [c["id"]] if c.get("id") else titles.get(c["title"].lower(), [])
        if len(found) != 1:
            sys.exit(f"{c['title']!r}: {'no' if not found else 'more than one'} owned book with that title (use \"id\")")
        tid = found[0]
        title_ids.append(tid)
        for v in c.get("values", []):
            value = check_value(c["title"], v)
            char_rows.append(f"({lit(tid)}::uuid, {lit(v['category'])}, {lit(value)}, {lit(v.get('character'))}, "
                             f"{lit(v['url'])}, {lit(v['quote'].strip()[:600])})")

    sql = []
    if author_rows:
        sql.append(f"""
          insert into public.author_identities (owner_id, person_id, category, value, source, source_url, quote, confirmed)
          select p.owner_id, v.pid, v.cat::public.identity_category, v.val, 'claude', v.url, v.quote, false
          from (values {', '.join(author_rows)}) v(pid, cat, val, url, quote)
          join public.people p on p.id = v.pid
          where not exists (select 1 from public.field_sources f where f.entity_table = 'people' and f.entity_id = v.pid
                            and f.field = public.rejected_marker('identity', v.cat::public.identity_category, v.val))
            and not exists (select 1 from public.author_identities a where a.person_id = v.pid
                            and a.category = v.cat::public.identity_category and a.source = 'alexandra')
          on conflict do nothing
          returning 'author' as kind, value""")
    if person_ids:
        sql.append(f"update public.people set identity_checked_at = now() where id in ({', '.join(lit(p) for p in person_ids)}) "
                   "returning 'checked' as kind, name as value")
    if char_rows:
        sql.append(f"""
          insert into public.character_representations (owner_id, title_id, category, value, character_name, source, source_url, quote, confirmed)
          select t.owner_id, v.tid, v.cat::public.identity_category, v.val, v.who, 'claude', v.url, v.quote, false
          from (values {', '.join(char_rows)}) v(tid, cat, val, who, url, quote)
          join public.titles t on t.id = v.tid
          where not exists (select 1 from public.field_sources f where f.entity_table = 'titles' and f.entity_id = v.tid
                            and f.field = public.rejected_marker('rep', v.cat::public.identity_category, v.val))
            and not exists (select 1 from public.character_representations r where r.title_id = v.tid
                            and r.category = v.cat::public.identity_category and r.source = 'alexandra')
          on conflict do nothing
          returning 'character' as kind, value""")

    if dry:
        print(f"Dry run: {len(person_ids)} authors, {len(author_rows)} author values, "
              f"{len(title_ids)} books, {len(char_rows)} character values. Nothing saved.")
        return
    saved = []
    for s in sql:
        saved += query(s)
    kinds = {}
    for r in saved:
        kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
    print(f"Authors looked up: {kinds.get('checked', 0)} · author values saved: {kinds.get('author', 0)} "
          f"of {len(author_rows)} · character values saved: {kinds.get('character', 0)} of {len(char_rows)}")

    # Own voices, for the books these authors wrote and the books listed.
    if not (person_ids or title_ids):
        return
    ids = ", ".join(lit(i) for i in person_ids + title_ids)
    rows = query(f"""
      select t.id, t.title, t.own_voices,
        (select f.source from public.field_sources f where f.entity_table = 'titles' and f.entity_id = t.id and f.field = 'own_voices') src,
        (select coalesce(json_agg(json_build_object('c', a.category, 'v', a.value)), '[]') from public.credits k
           join public.author_identities a on a.person_id = k.person_id where k.title_id = t.id and k.role <> 'narrator') authors,
        (select coalesce(json_agg(json_build_object('c', r.category, 'v', r.value)), '[]') from public.character_representations r
           where r.title_id = t.id) chars
      from public.titles t
      where t.id in (select k.title_id from public.credits k where k.person_id in ({ids})) or t.id in ({ids})""")
    suggest = []
    for r in rows:
        if r["src"] == "alexandra" or r["own_voices"] is not None:
            continue
        theirs = {(a["c"], a["v"].strip().lower()) for a in r["authors"] if counts_for_own_voices(a["c"], a["v"])}
        shared = [c for c in r["chars"] if counts_for_own_voices(c["c"], c["v"]) and (c["c"], c["v"].strip().lower()) in theirs]
        if shared:
            suggest.append(r)
            print(f"  own voices suggested: {r['title']} ({', '.join(c['v'] for c in shared)})")
    if suggest:
        ids = ", ".join(lit(r["id"]) for r in suggest)
        query(f"""
          update public.titles set own_voices = true where id in ({ids});
          insert into public.field_sources (owner_id, entity_table, entity_id, field, source, confirmed)
          select owner_id, 'titles', id, 'own_voices', 'claude', false from public.titles where id in ({ids})
          on conflict (entity_table, entity_id, field) do nothing;""")


if __name__ == "__main__":
    main()
