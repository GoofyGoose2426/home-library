"""Find a best-guess cover for every title (Phase 1, step 7).

Looks each book up on Open Library: by ISBN when a copy has one, otherwise by
title and author. Results are cached in data/covers/cache.json, so re-running
only looks up books not tried before. `--apply` then writes covers to copies
that don't have one yet, marked unconfirmed with their source, and never
touches a cover Alexandra set or removed.

Run from the project folder:
  python3 -I scripts/covers/find_covers.py          # look up (slow: ~1 per second)
  python3 -I scripts/covers/find_covers.py --apply  # save to the database
"""

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "covers" / "cache.json"
PROJECT_REF = "hfykwgjzmmcwmsqmfwnt"
USER_AGENT = "HomeLibrary/1.0 (private personal book catalog)"
PAUSE = 1.0
NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
                "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
                "nineteen", "twenty"] + [str(n) for n in range(21, 100)]  # seconds between Open Library requests


def env(name):
    for line in (ROOT / ".env.supabase").read_text().splitlines():
        key, _, value = line.partition("=")
        if key.strip() == name:
            return value.strip()
    raise SystemExit(f"{name} is missing from .env.supabase")


def sql(query):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={"Authorization": f"Bearer {env('SUPABASE_ACCESS_TOKEN')}",
                 "Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except Exception:
            time.sleep(5 * (attempt + 1))
    return None


def cover_exists(url):
    req = urllib.request.Request(url + "?default=false", method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status == 200
    except Exception:
        return False


def fold(text):
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def norm(title):
    t = fold(title).split(":")[0].replace("&", "and")
    t = re.sub(r"\(.*?\)|[^a-z0-9 ]", " ", t)
    t = re.sub(r"^(the|a|an)\s+", "", t.strip())
    return re.sub(r"\s+", " ", t).strip()


def surname(name):
    words = re.sub(r"[^a-z\- ]", " ", fold(name)).split()
    return words[-1] if words else ""


def load_titles():
    return sql("""
        select t.id, t.title, t.book_type, s.name as series, t.series_number,
          coalesce((select json_agg(p.name order by c.position) from credits c join people p on p.id = c.person_id
                    where c.title_id = t.id and c.role = 'author'), '[]') as authors,
          coalesce((select json_agg(cp.isbn13) from copies cp where cp.title_id = t.id and cp.isbn13 is not null), '[]') as isbns
        from titles t left join series s on s.id = t.series_id
        order by t.title""")


def search(title, authors):
    params = {"title": title, "limit": 10,
              "fields": "key,title,author_name,cover_i,edition_count,first_publish_year"}
    if authors:
        params["author"] = surname(authors[0])
    data = get_json("https://openlibrary.org/search.json?" + urllib.parse.urlencode(params))
    time.sleep(PAUSE)
    return (data or {}).get("docs", [])


def pick(docs, title, authors, volume=None):
    want = norm(title)
    names = {surname(a) for a in authors}
    best = None
    for d in docs:
        if not d.get("cover_i"):
            continue
        got = norm(d.get("title", ""))
        author_ok = not names or names & {surname(a) for a in d.get("author_name", [])}
        if volume is not None:
            words = fold(d.get("title", ""))
            title_ok = want in got and (re.search(rf"\b{volume}\b", words)
                                        or re.search(rf"\b{NUMBER_WORDS[volume]}\b", words))
        else:
            title_ok = got == want
        if title_ok and author_ok:
            if not best or d.get("edition_count", 0) > best.get("edition_count", 0):
                best = d
    return best


def look_up(t):
    authors = t["authors"] if isinstance(t["authors"], list) else json.loads(t["authors"])
    isbns = t["isbns"] if isinstance(t["isbns"], list) else json.loads(t["isbns"])
    for isbn in isbns:
        url = f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
        found = cover_exists(url)
        time.sleep(PAUSE)
        if found:
            return dict(status="found", source="openlibrary", by="isbn", isbn=isbn, url=url)

    volume = None
    title = t["title"]
    m = re.match(r"^(.*?),? Vol\. (\d+)$", title)
    if m:
        title, volume = m.group(1), int(m.group(2))
    doc = pick(search(title, authors), title, authors, volume)
    if not doc and volume is None and ":" in t["title"]:
        doc = pick(search(t["title"].split(":")[0], authors), t["title"].split(":")[0], authors)
    if not doc:
        return dict(status="none")
    return dict(status="found", source="openlibrary", by="search",
                url=f"https://covers.openlibrary.org/b/id/{doc['cover_i']}-M.jpg",
                work=f"https://openlibrary.org{doc['key']}", matched_title=doc.get("title"),
                matched_authors=doc.get("author_name", [])[:3])


def find():
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    titles = load_titles()
    todo = [t for t in titles if t["id"] not in cache]
    print(f"{len(titles)} titles, {len(todo)} to look up", flush=True)
    for i, t in enumerate(todo, 1):
        cache[t["id"]] = dict(title=t["title"], **look_up(t))
        if i % 25 == 0 or i == len(todo):
            CACHE.parent.mkdir(parents=True, exist_ok=True)
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + "\n")
            found = sum(1 for v in cache.values() if v["status"] == "found")
            print(f"{i}/{len(todo)} looked up; {found} covers found so far", flush=True)


def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def apply():
    cache = json.loads(CACHE.read_text())
    found = [(tid, v) for tid, v in cache.items() if v["status"] == "found"]
    for i in range(0, len(found), 200):
        rows = ",".join(f"({q(tid)}::uuid, {q(v['url'])}, {q(v.get('isbn'))})" for tid, v in found[i:i + 200])
        result = sql(f"""
          with found(title_id, url, isbn) as (values {rows}),
          targets as (
            select c.id, f.url, (f.isbn is not null and f.isbn = c.isbn13) as by_isbn
            from copies c join found f on f.title_id = c.title_id
            where c.cover_url is null and c.cover_path is null
              and not exists (select 1 from field_sources s where s.entity_table = 'copies'
                              and s.entity_id = c.id and s.field = 'cover_url' and s.source = 'alexandra')
          ),
          updated as (
            update copies c set cover_url = t.url, cover_confirmed = t.by_isbn
            from targets t where c.id = t.id returning c.id, c.owner_id, t.by_isbn
          ),
          sourced as (
            insert into field_sources (owner_id, entity_table, entity_id, field, source, confirmed)
            select owner_id, 'copies', id, 'cover_url', 'openlibrary', by_isbn from updated
            on conflict (entity_table, entity_id, field) do nothing returning 1
          )
          select (select count(*) from updated) as copies_updated""")
        print(result, flush=True)


if __name__ == "__main__":
    apply() if "--apply" in sys.argv else find()
