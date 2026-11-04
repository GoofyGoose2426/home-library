"""Second cover search, for books that still have no cover (2026-11-04).

The first search (find_covers.py) only took an Open Library result whose title
matched exactly. This one tries harder for the books still without a cover:

  1. Open Library, searched by title and author together, accepting a result
     whose title matches once subtitles and series notes are dropped;
  2. Apple Books (ebooks, then audiobooks), which has most ebooks, audiobooks
     and manga volumes.

Every result still needs the author's surname to match. Covers Alexandra
removed as wrong are never suggested again. Suggestions are saved unconfirmed,
so they show dashed and wait in Check covers.

Run from the project folder:
  python3 -I scripts/covers/find_more_covers.py          # look up (slow)
  python3 -I scripts/covers/find_more_covers.py --apply  # save to the database
"""

import json
import re
import sys
import time
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from find_covers import CACHE as FIRST_CACHE, fold, get_json, norm, sql, surname  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "covers" / "cache-2.json"
OL_PAUSE = 1.0
APPLE_PAUSE = 3.5  # Apple asks for no more than about 20 searches a minute


def load_missing():
    return sql("""
        select t.id, t.title,
          coalesce((select json_agg(p.name order by c.position) from credits c join people p on p.id = c.person_id
                    where c.title_id = t.id and c.role = 'author'), '[]') as authors,
          exists (select 1 from copies c where c.title_id = t.id and c.gone_at is null and c.format = 'audiobook') as audio,
          coalesce((select json_agg(distinct c.cover_url) from copies c where c.title_id = t.id and c.cover_url is not null), '[]') as old_urls
        from titles t
        where exists (select 1 from copies c where c.title_id = t.id and c.gone_at is null)
          and not exists (select 1 from copies c where c.title_id = t.id and c.gone_at is null
                          and (c.cover_url is not null or c.cover_path is not null))
        order by t.title""")


def short(title):
    """The title without its subtitle, bracketed notes or 'Book 2' tails."""
    t = re.split(r"[:(\[]", title)[0]
    t = re.sub(r",?\s+(book|vol\.?|volume|#)\s*\d+.*$", "", t, flags=re.I)
    return norm(t)


def title_ok(want, got):
    a, b = short(want), short(got)
    return bool(a) and (a == b or (len(a) > 6 and (b.startswith(a) or a.startswith(b)) and len(b) > 6))


def author_ok(authors, names):
    want = {surname(a) for a in authors}
    return not want or bool(want & {surname(n) for n in names})


def volume_ok(want, got):
    """'Ouran High School Host Club, Vol. 3' must find volume 3, not 1."""
    m = re.search(r"(?:\bvol\.?|\bvolume|\bbook|#)\s*(\d+)", want, re.I)
    if not m:
        return True
    return bool(re.search(rf"(?:\bvol\.?|\bvolume|\bbook|#|\b)\s*0*{m.group(1)}\b", got, re.I))


def open_library(t, authors):
    q = short(t["title"]) + (" " + surname(authors[0]) if authors else "")
    data = get_json("https://openlibrary.org/search.json?" + urllib.parse.urlencode(
        {"q": q, "limit": 20, "fields": "key,title,author_name,cover_i,edition_count"}))
    time.sleep(OL_PAUSE)
    best = None
    for d in (data or {}).get("docs", []):
        if d.get("cover_i") and title_ok(t["title"], d.get("title", "")) and volume_ok(t["title"], d.get("title", "")) \
                and author_ok(authors, d.get("author_name", [])):
            if not best or d.get("edition_count", 0) > best.get("edition_count", 0):
                best = d
    if best:
        return dict(status="found", source="openlibrary", url=f"https://covers.openlibrary.org/b/id/{best['cover_i']}-M.jpg",
                    page=f"https://openlibrary.org{best['key']}", matched_title=best.get("title"),
                    matched_authors=best.get("author_name", [])[:3])
    return None


def apple(t, authors, media):
    term = short(t["title"]) + (" " + authors[0] if authors else "")
    data = get_json("https://itunes.apple.com/search?" + urllib.parse.urlencode(
        {"term": term, "media": media, "limit": 15, "country": "ca"}))
    time.sleep(APPLE_PAUSE)
    for r in (data or {}).get("results", []):
        name = r.get("trackName") or r.get("collectionName") or ""
        art = r.get("artworkUrl100") or r.get("artworkUrl60")
        page = r.get("trackViewUrl") or r.get("collectionViewUrl")
        if art and page and title_ok(t["title"], name) and volume_ok(t["title"], name) \
                and author_ok(authors, [r.get("artistName", "")]):
            return dict(status="found", source=page.split("?")[0], url=re.sub(r"/\d+x\d+bb\.", "/600x600bb.", art),
                        page=page.split("?")[0], matched_title=name, matched_authors=[r.get("artistName")])
    return None


def look_up(t, removed):
    authors = t["authors"] if isinstance(t["authors"], list) else json.loads(t["authors"])
    tries = [lambda: open_library(t, authors), lambda: apple(t, authors, "ebook")]
    if t["audio"]:
        tries.append(lambda: apple(t, authors, "audiobook"))
    for attempt in tries:
        hit = attempt()
        if hit and hit["url"] not in removed:
            return hit
    return dict(status="none")


def find():
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    first = json.loads(FIRST_CACHE.read_text()) if FIRST_CACHE.exists() else {}
    titles = load_missing()
    todo = [t for t in titles if t["id"] not in cache]
    print(f"{len(titles)} books without a cover, {len(todo)} to look up", flush=True)
    for i, t in enumerate(todo, 1):
        old = t["old_urls"] if isinstance(t["old_urls"], list) else json.loads(t["old_urls"])
        removed = set(old) | ({first[t["id"]]["url"]} if first.get(t["id"], {}).get("url") else set())
        cache[t["id"]] = dict(title=t["title"], **look_up(t, removed))
        if i % 10 == 0 or i == len(todo):
            CACHE.parent.mkdir(parents=True, exist_ok=True)
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n")
            found = sum(1 for v in cache.values() if v["status"] == "found")
            print(f"{i}/{len(todo)} looked up; {found} covers found so far", flush=True)


def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def apply():
    cache = json.loads(CACHE.read_text())
    found = [(tid, v) for tid, v in cache.items() if v["status"] == "found"]
    rows = ",".join(f"({q(tid)}::uuid, {q(v['url'])}, {q(v['source'])})" for tid, v in found)
    # A cover she set or removed herself is hers: the database refuses to
    # overwrite it (protect_alexandra_values), so those copies are skipped.
    print(sql(f"""
      with found(title_id, url, source) as (values {rows}),
      targets as (
        select c.id, f.url, f.source from copies c join found f on f.title_id = c.title_id
        where c.gone_at is null and c.cover_url is null and c.cover_path is null
          and not exists (select 1 from field_sources s where s.entity_table = 'copies' and s.entity_id = c.id
                          and s.field = 'cover_url' and s.source = 'alexandra')
      ),
      updated as (
        update copies c set cover_url = t.url, cover_confirmed = false
        from targets t where c.id = t.id returning c.id, c.owner_id, t.source
      ),
      sourced as (
        insert into field_sources (owner_id, entity_table, entity_id, field, source, confirmed)
        select owner_id, 'copies', id, 'cover_url', source, false from updated
        on conflict (entity_table, entity_id, field) do update set source = excluded.source, confirmed = false
        returning 1
      )
      select (select count(distinct c.title_id) from copies c join updated u on u.id = c.id) as books,
             (select count(*) from updated) as copies"""), flush=True)


if __name__ == "__main__":
    apply() if "--apply" in sys.argv else find()
