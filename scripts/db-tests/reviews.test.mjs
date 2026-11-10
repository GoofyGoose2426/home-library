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
const t1 = (await add({ title: "The Fifth Season" }, { format: "trade_paperback", source: "shelf" }))[0].id;
await q(`insert into public.reviews (title_id, body, mood_reactions, broke_my_brain, would_reread) values ($1, 'Wow', array['cried','book_hangover','ending'], true, true)`, [t1]);
const r = (await q(`select mood_reactions from public.reviews where title_id=$1`, [t1]))[0];
check(r.mood_reactions.length === 3, "approved moods save");
let bad = false; try { await q(`update public.reviews set mood_reactions = array['disappointed'] where title_id=$1`, [t1]); } catch { bad = true; }
check(bad, "a mood that isn't on her list is refused");
await db.exec(`reset role; insert into auth.users values ('22222222-2222-2222-2222-222222222222','x@example.com'); set test.uid = '22222222-2222-2222-2222-222222222222'; set role authenticated;`);
const seen = await q(`select count(*)::int n from public.reviews`);
let wrote = true; try { const u = await q(`update public.reviews set body = 'hacked' returning id`); wrote = u.length > 0; } catch { wrote = false; }
check(seen[0].n === 0 && !wrote, "another login can't read or change her reviews");
console.log(ok ? "ALL PASS" : "SOME FAILED"); process.exit(ok ? 0 : 1);
