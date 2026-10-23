"""Build the Phase 1 import plan from the shelf photos, app screenshots and seed.

Reads (never writes) Alexandra's originals. Inputs are the transcriptions in
data/import/raw/ plus data/seed-books.json; output is data/import/plan.json
(titles with their copies) and data/import/review.json (everything that needs
Alexandra's eye before saving). Safe to re-run: output is fully rebuilt and
every title and review item has a stable key.

Run: python3 -I scripts/import/build_plan.py
"""

import csv
import difflib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "import" / "raw"
OUT = ROOT / "data" / "import"
LIBROFM_CSV = ROOT / "Books" / "Audiobooks" / "librofm-audiobook-library.csv"

# --------------------------------------------------------------------------
# Corrections to seed rows, read from the photos (see raw/shelves.tsv notes).
# needs_check=False means the photo settled the question.
# --------------------------------------------------------------------------
SEED_FIXES = {
    210: dict(title="Pride and Prejudice", edition="Peacock edition, illustrated by Hugh Thomson"),
    299: dict(title="The Hobbit: The Graphic Novel", author="J.R.R. Tolkien; Chuck Dixon; David Wenzel"),
    56: dict(title="Burn", author="TJ Klune", series="Elementally Evolved", series_no=1, needs_check=False),
    80: dict(author="Mollyhall Seeley", genre_guess="Fantasy & paranormal", needs_check=False),
    112: dict(needs_check=False),
    139: dict(author="Marnie Stockman & Nick Coniglio"),
    143: dict(author="Luís de Camões, Cesário Verde, Mário de Sá-Carneiro, Fernando Pessoa",
              check_note="Bilingual anthology; contributors read from the spine"),
    144: dict(title="Meditations for Makers", check_note="Author first name not on the spine (Fitzpatrick, Nimbus)"),
    147: dict(title="The Love Letters of a Portuguese Nun", author="Gabriel de Guilleragues", needs_check=False),
    149: dict(title="Shine Your Icy Crown", needs_check=False),
    151: dict(needs_check=False),
    153: dict(title="The Raven and Other Favorite Poems", author="Edgar Allan Poe", needs_check=False),
    154: dict(check_note="Author isn't on the spine"),
    155: dict(author="Margaret Atwood, Emma Donoghue, Sandi Toksvig (intro) et al."),
    156: dict(title="Maiden, Mother, Crone: Fantastical Trans Femmes", author="Gwen Benaway (ed.)", needs_check=False),
    157: dict(location="Black bookcase · top shelf"),
    169: dict(author="Stanley Tigerman", needs_check=False),
    172: dict(title="Trupp: A Fuzzhead Tale", author="Janell Cannon", needs_check=False),
    194: dict(title="James and the Giant Peach", needs_check=False),
    208: dict(title="Jacob Two-Two's First Spy Case", needs_check=False),
    209: dict(title="The Darkness…", author="Eliot Schrefer",
              check_note="Title is partly hidden on the spine"),
    253: dict(title="The Wayfarer Redemption", needs_check=False),
    317: dict(author="Meléndez, Brine, Jones et al."),
    320: dict(title="Taproot: A Story About a Gardener and a Ghost", author="Keezy Young", needs_check=False),
    340: dict(author="S. Bear Bergman & Saul Freedman-Lawson", needs_check=False),
    341: dict(author="Loïc Locatelli-Kournwsky"),
    342: dict(author="Tillie Walden"),
    343: dict(author="Box Brown"),
    416: dict(needs_check=False),
    421: dict(check_note="Spine reads 'A Million Cats'; may be 'Millions of Cats' (Wanda Gág)"),
}

# Seed rows the photos show belong in the other folder from their shelf.
SEED_READ_OVERRIDE = {157: "read", 421: "read", 87: "unread"}

# Seed rows that look like the same physical book listed twice.
SEED_DUPLICATES = {173: (172, "The photo shows one Janell Cannon book, 'Trupp: A Fuzzhead Tale'. The seed may list it twice.")}

MANGA_RUNS = {
    245: ("Bastard!!", 10),
    246: ("Mars", 15),
    247: ("Ouran High School Host Club", 18),
}
MANGA_NOTES = {
    ("Mars", 3): "The shelf photo shows Mars Vols. 1–2 and 4–15. Vol. 3 isn't visible: is it missing or elsewhere?",
}
MANGA_AUTHORS = {"Kazushi Hagiwara", "Fuyumi Soryo", "Bisco Hatori", "Sanami Matoh", "Hyouta Fujiyama",
                 "Reibun Ike", "Gengoroh Tagame"}

PICTURE_BOOK_SEED = {166, 167, 168, 169, 170, 171, 172, 173, 182, 185, 187, 406, 407, 408, 409, 410, 411,
                     412, 421, 422}
EXCLUDED_GENRES = {"Art, craft & colouring"}
REFERENCE_SEED = {117, 174}  # Safe and Sound (home guide), Design Thinking Playbook

# Second physical copies of books already in the seed.
EXTRA_PRINT_COPIES = {
    "Pride and Prejudice (Penguin Clothbound Classics) / Jane Austen":
        ("Pride and Prejudice", "Jane Austen", "Penguin Clothbound Classics edition"),
    "Guess How Much I Love You (second copy) / Sam McBratney":
        ("Guess How Much I Love You", "Sam McBratney", "Second copy"),
}

# --------------------------------------------------------------------------
# Matching helpers
# --------------------------------------------------------------------------
ARTICLES = re.compile(r"^(the|a|an)\s+")


def fold(text):
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


def norm_title(title):
    t = fold(title)
    t = re.sub(r"\(.*?\)", "", t)
    t = t.split(":")[0]
    t = t.replace("&", "and")
    t = re.sub(r"[^a-z0-9 ]", "", t)
    t = ARTICLES.sub("", t.strip())
    return re.sub(r"\s+", " ", t).strip()


def surnames(author):
    names = set()
    for part in re.split(r";|&|,| and ", fold(author)):
        words = re.sub(r"[^a-z\- ]", " ", part).split()
        words = [w for w in words if w not in {"ed", "eds", "et", "al", "phd", "jr", "pere"}]
        if words:
            names.add(words[-1])
    return names


def split_authors(author):
    if not author or author.lower() in {"unknown", "various", "anthology", "check author"}:
        return []
    parts = re.split(r";|\s&\s|,\s(?!et al)", author)
    return [p.strip() for p in parts if p.strip()]


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", fold(text)).strip("-")[:80]


# --------------------------------------------------------------------------
# Load sources
# --------------------------------------------------------------------------

def load_tsv(name):
    with open(RAW / name, newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def shelf_rows():
    rows = load_tsv("shelves.tsv")
    seed_folder = {}
    new_books = []
    for r in rows:
        for part in filter(None, r["seed_ids"].split(",")):
            a, _, b = part.partition("-")
            for i in range(int(a), int(b or a) + 1):
                seed_folder[i] = r["folder"].lower()
        for entry in filter(None, (e.strip() for e in r["not_in_seed"].split(";"))):
            if "(location)" in entry:
                continue
            new_books.append((entry, r))
    return seed_folder, new_books


def parse_new(entry):
    title, _, author = entry.partition(" / ")
    uncertain = title.endswith("?") or author.endswith("?") or "…" in title
    return title.rstrip("?").strip(), author.rstrip("?").strip(), uncertain


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def main():
    seed = json.loads((ROOT / "data" / "seed-books.json").read_text())
    seed_folder, new_books = shelf_rows()
    titles = []
    review = []

    def add_review(kind, key, note, raw=None, suggested=None, title_key=None):
        review.append(dict(kind=kind, item_key=key, note=note, raw=raw or {},
                           suggested=suggested or {}, title_key=title_key))

    def new_title(**t):
        t.setdefault("subtitle", None)
        t.setdefault("series", None)
        t.setdefault("series_no", None)
        t.setdefault("book_type", "prose")
        t.setdefault("is_reference", False)
        t.setdefault("needs_check", False)
        t.setdefault("check_note", None)
        t.setdefault("genre_guess", None)
        t.setdefault("copies", [])
        t.setdefault("statuses", [])
        titles.append(t)
        return t

    # ---- Print books from the seed -------------------------------------
    for i, row in enumerate(seed):
        if i in SEED_DUPLICATES:
            keep, note = SEED_DUPLICATES[i]
            add_review("match_uncertain", f"seed-dup-{i}", note,
                       raw=dict(seed_row=i, title=row["title"], author=row["author"]),
                       suggested=dict(action="merge", into_seed_row=keep))
            continue
        row = {**row, **SEED_FIXES.get(i, {})}
        folder = SEED_READ_OVERRIDE.get(i) or seed_folder.get(i)
        status = "read" if folder == "read" else "unread"
        genre = row["genre_guess"]
        is_manga = row["author"] in MANGA_AUTHORS or i in MANGA_RUNS
        book_type = ("manga" if is_manga else
                     "graphic_novel" if genre == "Graphic novels & manga" else
                     "picture_book" if i in PICTURE_BOOK_SEED else
                     "poetry" if genre == "Poetry" else "prose")
        base = dict(
            authors=split_authors(row["author"]),
            book_type=book_type,
            is_reference=genre in EXCLUDED_GENRES or i in REFERENCE_SEED,
            needs_check=bool(row["needs_check"]),
            check_note=row.get("check_note") or (
                "Title or author uncertain in the shelf photo" if row["needs_check"] else None),
            genre_guess=genre,
        )
        copy = dict(format="print_unknown", source="shelf", location=row["location"],
                    edition=row.get("edition"),
                    evidence=f"seed row {i}" + ("" if i in seed_folder else " (not visible in any photo)"))
        if i not in seed_folder and i not in SEED_READ_OVERRIDE:
            add_review("title_uncertain", f"seed-unseen-{i}",
                       "This book is in the earlier list but I couldn't see it in any photo. Keep it?",
                       raw=dict(seed_row=i, title=row["title"]))

        if i in MANGA_RUNS:
            name, count = MANGA_RUNS[i]
            for vol in range(1, count + 1):
                t = new_title(key=f"{slug(name)}-vol-{vol}", title=f"{name}, Vol. {vol}",
                              series=name, series_no=vol, **base)
                t["copies"].append(dict(copy))
                t["statuses"].append(("shelf", status))
                if (name, vol) in MANGA_NOTES:
                    add_review("title_uncertain", f"manga-{slug(name)}-{vol}", MANGA_NOTES[(name, vol)],
                               title_key=t["key"])
            continue

        t = new_title(key=f"seed-{i}", title=row["title"], series=row.get("series"),
                      series_no=row.get("series_no"), **base)
        t["copies"].append(copy)
        t["statuses"].append(("shelf", status))
        if t["needs_check"]:
            add_review("title_uncertain", f"seed-check-{i}", t["check_note"],
                       raw=dict(seed_row=i, title=t["title"], author=row["author"]), title_key=t["key"])

    # ---- Print books seen in the photos but missing from the seed --------
    index = {}
    for t in titles:
        index.setdefault(norm_title(t["title"]), []).append(t)

    for entry, r in new_books:
        if entry in EXTRA_PRINT_COPIES:
            name, author, edition = EXTRA_PRINT_COPIES[entry]
            target = next(t for t in index[norm_title(name)] if surnames(author) & surnames("; ".join(t["authors"])))
            target["copies"].append(dict(format="print_unknown", source="shelf", location=r["shelf"],
                                         edition=edition, evidence=f"{r['folder']} {r['photo']}"))
            continue
        title, author, uncertain = parse_new(entry)
        vol = re.search(r"\bVol\. (\d+)$", title)
        is_manga = author in MANGA_AUTHORS
        t = new_title(
            key=f"shelf-{slug(title)}-{slug(author)[:30]}",
            title=title,
            authors=split_authors(author.replace(" (Anne Rice)", "")),
            series=re.sub(r",? Vol\. \d+$", "", title) if vol else None,
            series_no=int(vol.group(1)) if vol else None,
            book_type="manga" if is_manga else "prose",
            is_reference=False,
            needs_check=uncertain,
            check_note="Spine partly hidden or blurry in the photo" if uncertain else None,
        )
        t["copies"].append(dict(format="print_unknown", source="shelf", location=r["shelf"],
                                evidence=f"{r['folder']} {r['photo']} (not in earlier list)"))
        t["statuses"].append(("shelf", r["folder"].lower()))
        index.setdefault(norm_title(title), []).append(t)
        if uncertain:
            add_review("title_uncertain", f"shelf-check-{t['key']}", t["check_note"],
                       raw=dict(photo=f"{r['folder']}/{r['photo']}", reading=entry), title_key=t["key"])

    # ---- Ebooks and audiobooks -------------------------------------------
    digital = []
    for r in load_tsv("ebooks.tsv"):
        digital.append(dict(r, source="kobo", format="ebook"))
    for r in load_tsv("audiobooks.tsv"):
        digital.append(dict(r, format="audiobook"))

    librofm_isbn = {}
    with open(LIBROFM_CSV, newline="") as f:
        for r in csv.DictReader(f):
            librofm_isbn[(r["Title"], r["Author(s)"].replace(", ", "; "))] = r["ISBN"]

    match_counts = Counter()
    for d in digital:
        nt = norm_title(d["title"])
        is_omnibus = "omnibus" in d["note"]
        candidates = [] if is_omnibus else [
            t for t in index.get(nt, []) if surnames(d["author"]) & surnames("; ".join(t["authors"]))
        ]
        fuzzy = None
        if not candidates and not is_omnibus:
            # Same author, very similar title: ask before merging.
            for key, ts in index.items():
                if difflib.SequenceMatcher(None, nt, key).ratio() >= 0.88:
                    for t in ts:
                        if surnames(d["author"]) & surnames("; ".join(t["authors"])):
                            fuzzy = t
                            break
                if fuzzy:
                    break

        copy = dict(format=d["format"], source=d["source"],
                    external_id=slug(d["title"]),
                    edition_type="omnibus" if is_omnibus else None,
                    evidence=f"{d['source']} screenshot {d['file']}" if d["source"] != "librofm"
                    else "librofm-audiobook-library.csv")
        if d["source"] == "librofm":
            isbn = librofm_isbn.get((d["title"], d["author"]))
            copy.update(isbn13=isbn, external_id=isbn)
        narr = re.search(r"narrated by (.+)$", d["note"])
        if narr:
            copy["narrators"] = [n.strip() for n in re.split(r"&|,", narr.group(1)) if n.strip()]

        if candidates:
            target = candidates[0]
            match_counts["matched"] += 1
        else:
            target = new_title(
                key=f"{d['format']}-{slug(d['title'])}-{slug(d['author'])[:30]}",
                title=d["title"],
                authors=split_authors(d["author"]),
                series=d["series"] or None,
                series_no=float(d["series_no"]) if d["series_no"] else None,
                book_type="manga" if d["author"] in MANGA_AUTHORS else "prose",
            )
            index.setdefault(nt, []).append(target)
            match_counts["new"] += 1
            if fuzzy:
                add_review("match_uncertain", f"fuzzy-{target['key']}",
                           f"Is the {d['format']} '{d['title']}' the same book as '{fuzzy['title']}'?",
                           raw=dict(title=d["title"], author=d["author"], source=d["source"]),
                           suggested=dict(action="merge", into=fuzzy["key"]), title_key=target["key"])
        if not target.get("series") and d["series"]:
            target["series"] = d["series"]
            target["series_no"] = float(d["series_no"]) if d["series_no"] else None
        target["copies"].append(copy)

        status = d["status"]
        if status == "ask":
            target.setdefault("pending_ask", []).append((copy, d))
        else:
            target["statuses"].append((d["source"], status))
            if "in progress" in d["note"] or "<1 min" in d["note"]:
                target.setdefault("status_notes", []).append(f"{d['source']}: {d['note']}")

    for t in titles:
        for copy, d in t.pop("pending_ask", []):
            if any(v == "read" for _, v in t["statuses"]):
                continue
            add_review("status_needed", f"librofm-{copy['external_id']}",
                       "Libro.fm doesn't record whether you've finished it. Read or Unread?",
                       raw=dict(title=d["title"], author=d["author"]), title_key=t["key"])

    # ---- Read status per title and conflicts -----------------------------
    for t in titles:
        seen = t.pop("statuses")
        sources_read = sorted({s for s, v in seen if v == "read"})
        sources_unread = sorted({s for s, v in seen if v == "unread"})
        t["read_status"] = "read" if sources_read else "unread"
        t["status_sources"] = dict(read=sources_read, unread=sources_unread)
        if "shelf" in sources_unread and sources_read:
            add_review("status_conflict", f"status-{t['key']}",
                       f"The print copy is in your Unread photos, but {', '.join(sources_read)} says Finished. Read or Unread?",
                       raw=dict(title=t["title"], read=sources_read, unread=sources_unread),
                       suggested=dict(read_status="read"), title_key=t["key"])
        for note in t.pop("status_notes", []):
            if t["read_status"] == "read":
                continue
            add_review("status_conflict", f"status-note-{t['key']}-{slug(note)[:20]}",
                       f"Audible shows this as not finished ({note.split(': ', 1)[1]}). It's set to Unread. Change it?",
                       raw=dict(title=t["title"], note=note), suggested=dict(read_status=t["read_status"]),
                       title_key=t["key"])

    # ---- Write -----------------------------------------------------------
    keys = Counter(t["key"] for t in titles)
    dupes = [k for k, c in keys.items() if c > 1]
    assert not dupes, f"duplicate title keys: {dupes}"
    rkeys = Counter(r["item_key"] for r in review)
    assert all(c == 1 for c in rkeys.values()), [k for k, c in rkeys.items() if c > 1]

    (OUT / "plan.json").write_text(json.dumps(titles, ensure_ascii=False, indent=1) + "\n")
    (OUT / "review.json").write_text(json.dumps(review, ensure_ascii=False, indent=1) + "\n")

    copies = [c for t in titles for c in t["copies"]]
    multi = [t for t in titles if len({c["format"] for c in t["copies"]}) > 1]
    print(json.dumps(dict(
        titles=len(titles),
        copies=len(copies),
        copies_by_format=Counter(c["format"] for c in copies),
        titles_in_more_than_one_format=len(multi),
        read=Counter(t["read_status"] for t in titles),
        excluded_from_stats=sum(t["is_reference"] or t["book_type"] == "picture_book" for t in titles),
        digital_matched_to_existing=match_counts["matched"],
        digital_new_titles=match_counts["new"],
        review_items=Counter(r["kind"] for r in review),
    ), indent=1, default=dict))


if __name__ == "__main__":
    main()
