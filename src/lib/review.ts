import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REVIEW_FIELDS } from "./review-fields";

// What's waiting on the "To check" screen: values filled in for Alexandra
// that she hasn't confirmed, on books she still owns. Her own values never
// appear (they're confirmed by definition).

export type ReviewItem = {
  key: string; // e.g. "titles.description", "tags.genre"
  table: "titles" | "copies" | "tags";
  id: string; // the title or copy; for tags, the tag
  titleId: string;
  source: string;
};

export type ReviewRow = ReviewItem & {
  title: string;
  value: string | null;
  detail?: string; // e.g. which copy
};

async function readAll<T>(query: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

export async function loadWaiting(supabase: SupabaseClient): Promise<ReviewItem[]> {
  const plain = REVIEW_FIELDS.filter((f) => !f.key.startsWith("tags."));
  const [sources, tags, copies] = await Promise.all([
    readAll<{ entity_table: "titles" | "copies"; entity_id: string; field: string; source: string }>((from) =>
      supabase
        .from("field_sources")
        .select("entity_table, entity_id, field, source")
        .eq("confirmed", false)
        .neq("source", "alexandra")
        .in("field", [...new Set(plain.map((f) => f.key.split(".")[1]))])
        .order("entity_id")
        .range(from, from + 999),
    ),
    readAll<{ title_id: string; tag_id: string; source: string; tags: { kind: string } | null }>((from) =>
      supabase
        .from("title_tags")
        .select("title_id, tag_id, source, tags(kind)")
        .eq("confirmed", false)
        .order("title_id")
        .range(from, from + 999)
        .returns<{ title_id: string; tag_id: string; source: string; tags: { kind: string } | null }[]>(),
    ),
    readAll<{ id: string; title_id: string; gone_at: string | null }>((from) =>
      supabase.from("copies").select("id, title_id, gone_at").order("id").range(from, from + 999),
    ),
  ]);
  const titleOfCopy = new Map(copies.map((c) => [c.id, c.title_id]));
  const ownedCopy = new Set(copies.filter((c) => !c.gone_at).map((c) => c.id));
  const ownedTitle = new Set(copies.filter((c) => !c.gone_at).map((c) => c.title_id));
  const known = new Set(REVIEW_FIELDS.map((f) => f.key));

  const items: ReviewItem[] = [];
  for (const s of sources) {
    const key = `${s.entity_table}.${s.field}`;
    if (!known.has(key)) continue;
    const titleId = s.entity_table === "copies" ? titleOfCopy.get(s.entity_id) : s.entity_id;
    if (!titleId || !ownedTitle.has(titleId) || (s.entity_table === "copies" && !ownedCopy.has(s.entity_id))) continue;
    items.push({ key, table: s.entity_table, id: s.entity_id, titleId, source: s.source });
  }
  for (const t of tags) {
    const key = `tags.${t.tags?.kind}`;
    if (!known.has(key) || !ownedTitle.has(t.title_id)) continue;
    items.push({ key, table: "tags", id: t.tag_id, titleId: t.title_id, source: t.source });
  }
  return items;
}

const COPY_NAME: Record<string, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market",
  print_unknown: "Print",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

// The values for a page of items.
export async function withValues(supabase: SupabaseClient, items: ReviewItem[]): Promise<ReviewRow[]> {
  const titleIds = [...new Set(items.map((i) => i.titleId))];
  const copyIds = items.filter((i) => i.table === "copies").map((i) => i.id);
  const tagIds = items.filter((i) => i.table === "tags").map((i) => i.id);
  const [titles, copies, tags] = await Promise.all([
    titleIds.length
      ? supabase.from("titles").select("id, title, description, first_published, typical_pages, series_number, series(name)").in("id", titleIds)
      : { data: [], error: null },
    copyIds.length
      ? supabase.from("copies").select("id, format, publisher, pages, est_words").in("id", copyIds)
      : { data: [], error: null },
    tagIds.length ? supabase.from("tags").select("id, name").in("id", tagIds) : { data: [], error: null },
  ]);
  for (const r of [titles, copies, tags]) if (r.error) throw new Error(r.error.message);
  const t = new Map((titles.data ?? []).map((x: Record<string, unknown>) => [x.id as string, x]));
  const c = new Map((copies.data ?? []).map((x: Record<string, unknown>) => [x.id as string, x]));
  const g = new Map((tags.data ?? []).map((x: Record<string, unknown>) => [x.id as string, x.name as string]));

  return items.map((i) => {
    const title = t.get(i.titleId);
    const field = i.key.split(".")[1];
    let value: unknown = null;
    let detail: string | undefined;
    if (i.table === "tags") value = g.get(i.id);
    else if (i.table === "copies") {
      const copy = c.get(i.id);
      value = copy?.[field];
      detail = copy ? `${COPY_NAME[copy.format as string] ?? ""} copy` : undefined;
    } else if (field === "series") {
      const s = title?.series as { name: string } | null;
      value = s ? `${s.name}${title?.series_number != null ? ` #${Number(title.series_number)}` : ""}` : null;
    } else value = title?.[field];
    return {
      ...i,
      title: (title?.title as string) ?? "",
      value: value == null ? null : typeof value === "number" ? value.toLocaleString("en-CA", { useGrouping: field === "est_words" }) : String(value),
      detail,
    };
  });
}
