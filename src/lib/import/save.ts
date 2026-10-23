import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_BATCH, plan, type PlanTitle } from "./data";
import type { DecidedValue } from "./decisions";

const BATCH_SIZE = 400;

type ItemRow = {
  kind: string;
  item_key: string;
  raw: Record<string, unknown>;
  decision: "pending" | "accepted" | "edited" | "skipped";
  decided_value: DecidedValue | null;
};

export type SaveResult = {
  titlesAdded: number;
  copiesAdded: number;
  titlesAlreadySaved: number;
  skipped: number;
};

// Applies Alexandra's decisions to the plan, in memory.
export function applyDecisions(items: ItemRow[]) {
  const titles = new Map<string, PlanTitle & { edited: boolean; statusByAlexandra: boolean }>(
    plan.map((t) => [t.key, { ...t, copies: [...t.copies], edited: false, statusByAlexandra: false }]),
  );
  let skipped = 0;

  for (const item of items) {
    const key = item.raw.title_key as string | undefined;
    const title = key ? titles.get(key) : undefined;
    const value = item.decided_value as Record<string, unknown> | null;

    if (item.decision === "skipped" && title) {
      titles.delete(title.key);
      skipped++;
    } else if (item.decision === "edited" && title && value) {
      title.title = String(value.title);
      title.authors = value.authors as string[];
      title.needs_check = false;
      title.check_note = null;
      title.edited = true;
    } else if (value && "read_status" in value && title) {
      title.read_status = value.read_status as "read" | "unread";
      title.statusByAlexandra = true;
    } else if (value && "merge" in value && value.merge === false) {
      // Keep the possible duplicate as its own book.
      const raw = item.raw;
      const dupKey = `seed-${raw.seed_row}`;
      titles.set(dupKey, {
        key: dupKey,
        title: String(raw.title),
        authors: [],
        series: null,
        series_no: null,
        book_type: "picture_book",
        is_reference: false,
        needs_check: true,
        check_note: "Kept as a separate book during import review",
        genre_guess: "Children's & YA",
        read_status: raw.read_status === "read" ? "read" : "unread",
        copies: [{ format: "print_unknown", source: "shelf", location: String(raw.location) }],
        edited: false,
        statusByAlexandra: false,
      });
    }
  }
  return { titles: [...titles.values()], skipped };
}

function chunks<T>(rows: T[]) {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) out.push(rows.slice(i, i + BATCH_SIZE));
  return out;
}

// PostgREST returns at most 1,000 rows per request, so read in pages.
async function selectAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const batch = await must<T[]>(page(from, from + 999));
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

async function must<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data as T;
}

// Finds or creates rows keyed by a case-insensitive name; returns lower(name) -> id.
async function ensureNamed(
  supabase: SupabaseClient,
  table: "series" | "people" | "tags",
  names: string[],
  extra: Record<string, unknown> = {},
) {
  const ids = new Map<string, string>();
  const wanted = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!wanted.length) return ids;

  const existing = await selectAll<{ id: string; name: string }>((from, to) => {
    let query = supabase.from(table).select("id, name");
    if (table === "tags") query = query.eq("kind", extra.kind as string);
    return query.order("id").range(from, to);
  });
  for (const row of existing) {
    ids.set(row.name.toLowerCase(), row.id);
  }
  const missing = wanted.filter((n) => !ids.has(n.toLowerCase()));
  const unique = [...new Map(missing.map((n) => [n.toLowerCase(), n])).values()];
  for (const batch of chunks(unique)) {
    const rows = await must<{ id: string; name: string }[]>(
      supabase.from(table).insert(batch.map((name) => ({ name, ...extra }))).select("id, name"),
    );
    for (const row of rows) ids.set(row.name.toLowerCase(), row.id);
  }
  return ids;
}

// Saves the import. Re-runnable: books already saved (by import_key) are left
// exactly as they are, so later edits are never overwritten.
export async function saveImport(supabase: SupabaseClient, ownerId: string): Promise<SaveResult> {
  const items = await must<ItemRow[]>(
    supabase
      .from("import_items")
      .select("kind, item_key, raw, decision, decided_value")
      .eq("batch", IMPORT_BATCH),
  );
  const saved = await must<{ batch: string }[]>(
    supabase.from("import_batches").select("batch").eq("batch", IMPORT_BATCH),
  );
  if (saved.length) throw new Error("This import is already saved.");
  if (items.some((i) => i.decision === "pending")) {
    throw new Error("Some items still need a decision.");
  }
  const { titles, skipped } = applyDecisions(items);

  // Which books are already saved. A title is finished once its field_sources
  // rows exist (written last); one without them is from an interrupted run
  // and gets rebuilt. Finished books are never touched again.
  const titleIds = new Map<string, string>();
  for (const row of await selectAll<{ id: string; import_key: string }>((from, to) =>
    supabase.from("titles").select("id, import_key").not("import_key", "is", null).order("id").range(from, to),
  )) {
    titleIds.set(row.import_key, row.id);
  }
  const finished = new Set(
    (
      await selectAll<{ entity_id: string }>((from, to) =>
        supabase
          .from("field_sources")
          .select("entity_id")
          .eq("entity_table", "titles")
          .eq("field", "title")
          .order("id")
          .range(from, to),
      )
    ).map((r) => r.entity_id),
  );
  const added = titles.filter((t) => !finished.has(titleIds.get(t.key) ?? ""));

  const interrupted = added.flatMap((t) => (titleIds.has(t.key) ? [titleIds.get(t.key)!] : []));
  for (let i = 0; i < interrupted.length; i += 200) {
    const part = interrupted.slice(i, i + 200);
    await must(supabase.from("copies").delete().in("title_id", part).not("import_key", "is", null));
    await must(supabase.from("credits").delete().in("title_id", part));
    await must(supabase.from("title_tags").delete().in("title_id", part).eq("source", "import"));
  }

  const seriesIds = await ensureNamed(supabase, "series", added.flatMap((t) => (t.series ? [t.series] : [])));
  const peopleIds = await ensureNamed(supabase, "people", [
    ...added.flatMap((t) => t.authors),
    ...added.flatMap((t) => t.copies.flatMap((c) => c.narrators ?? [])),
  ]);
  const genreIds = await ensureNamed(
    supabase,
    "tags",
    added.flatMap((t) => (t.genre_guess ? [t.genre_guess] : [])),
    { kind: "genre" },
  );

  // Titles
  for (const batch of chunks(added.filter((t) => !titleIds.has(t.key)))) {
    const rows = await must<{ id: string; import_key: string }[]>(
      supabase
        .from("titles")
        .upsert(
          batch.map((t) => {
            const seriesId = t.series ? seriesIds.get(t.series.trim().toLowerCase()) ?? null : null;
            return {
              owner_id: ownerId,
              import_key: t.key,
              title: t.title,
              series_id: seriesId,
              series_number: seriesId ? t.series_no : null,
              book_type: t.book_type,
              read_status: t.read_status,
              is_reference: t.is_reference,
              needs_check: t.needs_check,
              check_note: t.check_note,
            };
          }),
          { onConflict: "owner_id,import_key", ignoreDuplicates: true },
        )
        .select("id, import_key"),
    );
    for (const r of rows) titleIds.set(r.import_key, r.id);
  }

  // Copies
  const copyRows = added.flatMap((t) =>
    t.copies.map((c, i) => ({
      owner_id: ownerId,
      import_key: `${t.key}#${i}`,
      title_id: titleIds.get(t.key)!,
      format: c.format,
      source: c.source,
      location: c.location ?? null,
      edition: c.edition ?? null,
      edition_type: c.edition_type ?? null,
      isbn13: c.isbn13 ?? null,
      external_id: c.external_id ?? null,
    })),
  );
  const copyIds = new Map<string, string>();
  for (const batch of chunks(copyRows)) {
    const rows = await must<{ id: string; import_key: string }[]>(
      supabase
        .from("copies")
        .upsert(batch, { onConflict: "owner_id,import_key", ignoreDuplicates: true })
        .select("id, import_key"),
    );
    for (const r of rows) copyIds.set(r.import_key, r.id);
  }

  // Credits: authors on titles, narrators on audiobook copies
  const credits = added.flatMap((t) => {
    const titleId = titleIds.get(t.key)!;
    const authors = [...new Set(t.authors.map((a) => a.trim()).filter(Boolean))];
    const authorCredits = authors.map((a, i) => ({
      person_id: peopleIds.get(a.toLowerCase())!,
      role: "author",
      position: i + 1,
      title_id: titleId,
    }));
    const narratorCredits = t.copies.flatMap((c, ci) => {
      const copyId = copyIds.get(`${t.key}#${ci}`);
      if (!copyId) return [];
      return [...new Set(c.narrators ?? [])].map((n, i) => ({
        person_id: peopleIds.get(n.toLowerCase())!,
        role: "narrator",
        position: i + 1,
        copy_id: copyId,
      }));
    });
    return [...authorCredits, ...narratorCredits];
  });
  for (const batch of chunks(credits)) await must(supabase.from("credits").insert(batch));

  // Rough genre from the shelf photos, to be reviewed in Phase 2
  const titleTags = added.flatMap((t) =>
    t.genre_guess
      ? [{ title_id: titleIds.get(t.key)!, tag_id: genreIds.get(t.genre_guess.toLowerCase())!,
           is_primary: true, source: "import", confirmed: false }]
      : [],
  );
  for (const batch of chunks(titleTags)) {
    await must(supabase.from("title_tags").upsert(batch, { ignoreDuplicates: true }));
  }

  // Where each value came from
  const sources = added.flatMap((t) => {
    const id = titleIds.get(t.key)!;
    const mine = (yes: boolean) => ({ source: yes ? "alexandra" : "import", confirmed: yes });
    return [
      { entity_table: "titles", entity_id: id, field: "title", ...mine(t.edited) },
      { entity_table: "titles", entity_id: id, field: "authors", ...mine(t.edited) },
      { entity_table: "titles", entity_id: id, field: "read_status", ...mine(t.statusByAlexandra) },
      { entity_table: "titles", entity_id: id, field: "book_type", ...mine(false) },
    ];
  });
  for (const batch of chunks(sources)) {
    await must(
      supabase
        .from("field_sources")
        .upsert(batch, { onConflict: "entity_table,entity_id,field", ignoreDuplicates: true }),
    );
  }

  const result = {
    titlesAdded: added.length,
    copiesAdded: copyIds.size,
    titlesAlreadySaved: titles.length - added.length,
    skipped,
  };
  await must(supabase.from("import_batches").insert({ owner_id: ownerId, batch: IMPORT_BATCH, summary: result }));
  return result;
}
