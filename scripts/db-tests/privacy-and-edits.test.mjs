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
const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222";
await db.exec(`insert into auth.users values ('${A}','a@example.com'),('${B}','b@example.com')`);
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
let fails = 0; const check = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fails++; };
const as = async (role, uid, headers) => db.exec(`reset role; select set_config('test.uid', '${uid ?? ""}', false);
  select set_config('request.headers', '${JSON.stringify(headers ?? {})}', false); set role ${role};`);
const refused = async (sql) => { try { const r = await db.query(sql); return (r.affectedRows ?? 0) === 0 && r.rows.length === 0; } catch { return true; } };

// Every table in the app is locked.
const tables = (await q(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1`));
check(tables.length >= 15 && tables.every((t) => t.relrowsecurity), `row security on all ${tables.length} tables (${tables.filter((t) => !t.relrowsecurity).map((t) => t.relname).join(", ") || "none missing"})`);

// Alexandra's library: one book on loan with a keepsake note, one gone.
await as("authenticated", A);
const add = async (title, author) => (await q(`select public.add_book(null, $1::jsonb, $2::jsonb) id`,
  [JSON.stringify({ title, credits: [{ name: author, role: "author" }] }), JSON.stringify({ format: "trade_paperback", source: "shelf" })]))[0].id;
const kept = await add("Wolfsong", "TJ Klune"), gone = await add("Old Book", "Someone");
await q(`update public.copies set on_loan_to = 'Sam', keepsake_notes = 'signed' where title_id = $1`, [kept]);
await q(`update public.copies set gone_at = now(), gone_reason = 'donated' where title_id = $1`, [gone]);
const counts = {};
for (const t of tables) counts[t.relname] = (await q(`select count(*)::int n from public.${t.relname}`))[0].n;
check(counts.titles === 2 && counts.copies === 2, "Alexandra sees her own books");

// Logged-out visitors see nothing and change nothing.
await as("anon");
let seen = [];
for (const t of tables) { try { if ((await q(`select count(*)::int n from public.${t.relname}`))[0].n > 0) seen.push(t.relname); } catch {} }
check(seen.length === 0, `logged-out visitor sees no rows (${seen.join(", ") || "none"})`);
check(await refused(`insert into public.titles (owner_id, title) values ('${A}', 'x')`), "logged-out visitor can't add a book");
check(await refused(`update public.titles set title = 'x'`), "logged-out visitor can't change a book");

// Any other signed-in account sees nothing and changes nothing.
await as("authenticated", B);
seen = [];
for (const t of tables) { try { if ((await q(`select count(*)::int n from public.${t.relname}`))[0].n > 0) seen.push(t.relname); } catch {} }
check(seen.length === 0, `another account sees none of her rows (${seen.join(", ") || "none"})`);
check(await refused(`update public.titles set title = 'x'`), "another account can't change her books");
check(await refused(`delete from public.copies`), "another account can't delete her copies");
check(await refused(`insert into public.titles (owner_id, title) values ('${A}', 'x')`), "another account can't add to her library");

// The view-only link.
const hash = "a".repeat(64);
await as("authenticated", A);
await q(`insert into public.share_links (token_hash) values ($1)`, [hash]);
// Phase 3: a review and a pinned answer, which the link may read but never change.
await q(`insert into public.reviews (title_id, rating, body, mood_reactions) values ($1, 4.5, 'Loved it', array['swooned'])`, [kept]);
await q(`insert into public.saved_reports (name, spec, chart_type) values ('Unread by genre', '{"v":1,"status":["unread"],"show":{"kind":"group","by":"genre"}}', 'bars')`);
await as("anon", null, { "x-share-key": hash });
check((await q(`select body from public.reviews`))[0]?.body === "Loved it", "link shows her reviews");
check((await q(`select count(*)::int n from public.saved_reports`))[0].n === 1, "link shows her pinned answers");
check(await refused(`update public.reviews set body = 'x'`), "link can't change a review");
check(await refused(`insert into public.reviews (owner_id, title_id, body) values ('${A}', '${kept}', 'x')`), "link can't add a review");
check(await refused(`update public.saved_reports set name = 'x'`), "link can't rename a pinned answer");
check(await refused(`delete from public.saved_reports`), "link can't unpin an answer");
check(await refused(`insert into public.saved_reports (owner_id, name, spec, chart_type) values ('${A}', 'x', '{"v":1,"show":{"kind":"count"}}', 'sentence')`), "link can't pin an answer");
const vt = await q(`select title from public.titles order by 1`);
check(vt.length === 1 && vt[0].title === "Wolfsong", `link shows owned books, not the Gone list (${vt.map((r) => r.title)})`);
check((await q(`select count(*)::int n from public.copies`))[0].n === 1, "link hides gone copies");
check(await refused(`select on_loan_to from public.copies`), "link can't see who has a book on loan");
check(await refused(`select keepsake_notes from public.copies`), "link can't see keepsake notes");
check(await refused(`select gone_reason from public.copies`), "link can't see why a book left");
check((await q(`select count(*)::int n from public.people`))[0].n >= 1, "link shows authors");
check(await refused(`update public.titles set title = 'x'`), "link can't change a book");
check(await refused(`insert into public.title_tags (owner_id, title_id, tag_id) select owner_id, '${kept}', id from public.tags limit 1`), "link can't add a tag");
check(await refused(`select * from public.share_links`), "link can't see the link table");
await as("anon", null, { "x-share-key": "b".repeat(64) });
check((await q(`select count(*)::int n from public.titles`))[0].n === 0, "a wrong key sees nothing");
await as("authenticated", A);
await q(`update public.share_links set turned_off_at = now()`);
await as("anon", null, { "x-share-key": hash });
check((await q(`select count(*)::int n from public.titles`))[0].n === 0, "a turned-off link sees nothing");

// Her edits always win over a later fill-in.
await as("authenticated", A);
await q(`update public.titles set description = 'My own words.' where id = $1`, [kept]);
await q(`insert into public.field_sources (entity_table, entity_id, field, source, confirmed) values ('titles', $1, 'description', 'alexandra', true)`, [kept]);
await q(`select public.apply_book_details($1, $2::jsonb, '[]')`, [kept, JSON.stringify({ source: "openlibrary", description: "Publisher blurb.", first_published: 2016 })]);
const k = (await q(`select description, first_published from public.titles where id = $1`, [kept]))[0];
check(k.description === "My own words.", "fill-in leaves her description alone");
check(k.first_published === 2016, "fill-in still fills an empty field");
await q(`update public.field_sources set source = 'alexandra', confirmed = true where entity_id = $1 and field = 'first_published'`, [kept]);
await q(`select public.apply_book_details($1, $2::jsonb, '[]')`, [kept, JSON.stringify({ source: "googlebooks", first_published: 1999 })]);
check((await q(`select first_published from public.titles where id = $1`, [kept]))[0].first_published === 2016, "a confirmed value isn't replaced by a later run");

// No duplicate authors from different spellings.
await add("Heartsong", "T. J. Klune");
check((await q(`select count(*)::int n from public.people where name ilike '%klune%'`))[0].n === 1, "T. J. Klune and TJ Klune are one person");

console.log(fails ? `${fails} FAILED` : "ALL PASSED");
process.exit(fails ? 1 : 0);
