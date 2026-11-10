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
const add = (book, copy) => q(`select public.add_book(null, $1::jsonb, $2::jsonb) id`, [JSON.stringify(book), JSON.stringify(copy)]);
let ok = true; const check = (c, m) => { console.log(c ? "PASS" : "FAIL", m); ok &&= c; };
try { await q(`select public.owner_setup()`); } catch {}
const t1 = (await add({ title: "Doctor Who Colouring Book" }, { format: "trade_paperback", source: "shelf" }))[0].id;
await db.exec(`reset role; update public.titles set needs_check = true where id = '${t1}'; set role authenticated;`);
await q(`select public.clear_review($1, array['author'])`, [t1]);
let r = (await q(`select review_cleared, needs_check from public.titles where id=$1`, [t1]))[0];
check(JSON.stringify(r.review_cleared) === '["author"]' && r.needs_check === true, `author cleared only: ${JSON.stringify(r)}`);
await q(`select public.clear_review($1, array['cover','author','guess'])`, [t1]);
r = (await q(`select review_cleared, needs_check from public.titles where id=$1`, [t1]))[0];
check(JSON.stringify(r.review_cleared) === '["author","cover"]' && r.needs_check === false, `all cleared, no repeats: ${JSON.stringify(r)}`);
await q(`select public.clear_review($1, array['cover'], true)`, [t1]);
r = (await q(`select review_cleared from public.titles where id=$1`, [t1]))[0];
check(JSON.stringify(r.review_cleared) === '["author"]', `undo puts the cover flag back: ${JSON.stringify(r)}`);
let bad = false; try { await q(`select public.clear_review($1, array['stars'])`, [t1]); } catch { bad = true; }
check(bad, "unknown reason refused");
await db.exec(`reset role; insert into auth.users values ('22222222-2222-2222-2222-222222222222','x@example.com'); set test.uid = '22222222-2222-2222-2222-222222222222'; set role authenticated;`);
bad = false; try { await q(`select public.clear_review($1, array['author'], true)`, [t1]); } catch { bad = true; }
await db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
r = (await q(`select review_cleared from public.titles where id=$1`, [t1]))[0];
check(bad && JSON.stringify(r.review_cleared) === '["author"]', "another login can't change it");
let anon = false; try { await db.exec(`reset role; set role anon;`); await q(`select public.clear_review($1, array['author'])`, [t1]); } catch { anon = true; }
check(anon, "logged-out visitors can't call it");
console.log(ok ? "ALL PASS" : "SOME FAILED"); process.exit(ok ? 0 : 1);
