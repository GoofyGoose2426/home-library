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
const ins = (spec, chart = "bars") => q(`insert into public.saved_reports (name, spec, chart_type) values ('Test', $1::jsonb, $2) returning id`, [JSON.stringify(spec), chart]);
const refused = async (fn) => { try { await fn(); return false; } catch { return true; } };
await ins({ v: 1, status: ["unread"], where: [{ field: "genre", any: ["Horror"] }], show: { kind: "group", by: "author_lgbtqia" } });
check(true, "a read-only lookup saves");
check(await refused(() => ins({ v: 1, show: { kind: "sql", query: "delete from titles" } })), "an unknown kind of answer is refused");
check(await refused(() => ins({ v: 1, sql: "delete from titles", show: { kind: "count" } })), "an extra key is refused");
check(await refused(() => ins({ v: 2, show: { kind: "count" } })), "an unknown version is refused");
check(await refused(() => ins({ v: 1, show: { kind: "count" } }, "pie")), "an unknown chart type is refused");
await db.exec(`reset role; set test.uid = '22222222-2222-2222-2222-222222222222'; insert into auth.users values ('22222222-2222-2222-2222-222222222222','x@example.com'); set role authenticated;`);
const seen = await q(`select count(*)::int n from public.saved_reports`);
check(seen[0].n === 0, "another login can't see her pinned answers");
await db.exec(`reset role; set role anon;`);
const anon = await q(`select count(*)::int n from public.saved_reports`).catch(() => [{ n: 0 }]);
check(anon[0].n === 0, "no one can see them without the view-only link");
console.log(ok ? "ALL PASS" : "SOME FAILED"); process.exit(ok ? 0 : 1);
