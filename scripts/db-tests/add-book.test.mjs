import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const dir = process.argv[2];
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
grant usage on schema auth to anon, authenticated;
create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
alter table storage.objects enable row level security;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
`);
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  try { await db.exec(fs.readFileSync(`${dir}/${f}`, "utf8")); }
  catch (e) { console.log("FAIL", f, e.message); process.exit(1); }
}
console.log("migrations ok");
process.on('unhandledRejection',e=>{console.log('ERROR',e.message,e.where??'');process.exit(1)});
const uid = "11111111-1111-1111-1111-111111111111";
await db.exec(`insert into auth.users values ('${uid}','a@example.com')`);
const owner = await db.query(`select column_default from information_schema.columns where table_name='people' and column_name='owner_id'`);
console.log("owner default:", owner.rows[0]?.column_default);
await db.exec(`set test.uid = '${uid}'; set role authenticated;`);
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
let ok = true; const check = (c, m) => { console.log(c ? "PASS" : "FAIL", m); ok &&= c; };
try { await q(`select public.owner_setup()`); } catch {}
const add = (book, copy) => q(`select public.add_book(null, $1::jsonb, $2::jsonb) id`, [JSON.stringify(book), JSON.stringify(copy)]);
const t1 = (await add({ title: "Wolfsong", credits: [{ name: "TJ Klune", role: "author" }] }, { format: "trade_paperback", source: "shelf" }))[0].id;
const t2 = (await add({ title: "Heartsong", credits: [{ name: "T. J. Klune", role: "author" }],
  description: "A long enough description of the book for the test to keep it.", first_published: 2019, typical_pages: 400, openlibrary_key: "/works/OL1W", looked_up: true,
  series: "Green Creek", series_number: 3, sources: { series: "openlibrary", description: "googlebooks", first_published: "openlibrary", typical_pages: "openlibrary" } },
  { format: "hardcover", source: "shelf", isbn13: "9781234567897", publisher: "Tor", pages: 420, est_words: 116000, sources: { publisher: "openlibrary", pages: "openlibrary", est_words: "openlibrary" } }))[0].id;
const people = await q(`select name from public.people`);
check(people.length === 1 && people[0].name === "TJ Klune", `one person for both spellings: ${JSON.stringify(people)}`);
const t = (await q(`select description, first_published, typical_pages, openlibrary_key, details_checked_at is not null checked from public.titles where id=$1`, [t2]))[0];
check(t.first_published === 2019 && t.typical_pages === 400 && t.checked && t.openlibrary_key === "/works/OL1W" && t.description.startsWith("A long"), "title details saved");
const fs2 = await q(`select field, source, confirmed from public.field_sources where entity_id=$1 order by field`, [t2]);
const m = Object.fromEntries(fs2.map((r) => [r.field, r.source + (r.confirmed ? "+" : "-")]));
check(m.description === "googlebooks+" && m.series === "openlibrary+" && m.title === "alexandra+" && m.first_published === "openlibrary+", `title sources ${JSON.stringify(m)}`);
const c = (await q(`select id, est_words, publisher, pages from public.copies where title_id=$1`, [t2]))[0];
const cs = Object.fromEntries((await q(`select field, source, confirmed from public.field_sources where entity_id=$1`, [c.id])).map((r) => [r.field, r.source + (r.confirmed ? "+" : "-")]));
check(c.est_words === 116000 && cs.est_words === "openlibrary+" && cs.publisher === "openlibrary+" && cs.format === "alexandra+", `copy sources ${JSON.stringify(cs)}`);
const fs1 = await q(`select field from public.field_sources where entity_id=$1`, [t1]);
check(!fs1.some((r) => ["description", "first_published", "typical_pages"].includes(r.field)), "no detail sources when none given");
const d1 = (await q(`select details_checked_at from public.titles where id=$1`, [t1]))[0];
check(d1.details_checked_at === null, "not marked checked without a look-up");
let bad = false; try { await add({ title: "X", sources: { series: "claude" } }, { format: "hardcover", source: "shelf" }); } catch { bad = true; }
check(bad, "unknown source refused");
// narrator + save_title_details matching
await q(`select public.add_book(null, $1::jsonb, $2::jsonb)`, [JSON.stringify({ title: "Audio", credits: [{ name: "tj  klune", role: "author" }] }), JSON.stringify({ format: "audiobook", source: "audible", narrators: ["Kirt Graves", "Kirt  Graves."] })]);
check((await q(`select count(*)::int n from public.people`))[0].n === 2, "narrator spellings merge too, author still one person");
await q(`select public.save_title_details($1, 'Wolfsong', '', 'prose', '', null, $2::jsonb, '[]'::jsonb, false)`, [t1, JSON.stringify([{ name: "T.J. KLUNE", role: "author" }])]);
check((await q(`select count(*)::int n from public.people`))[0].n === 2, "edit details reuses the same person");
console.log(ok ? "ALL PASS" : "SOME FAILED"); process.exit(ok ? 0 : 1);
