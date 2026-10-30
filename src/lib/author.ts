import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signCoverPaths } from "./covers";
import type { CopyFormat, CopySource } from "./library";
import type { IdentityCategory, IdentityValue } from "./representation";

export type AuthorBook = {
  id: string;
  title: string;
  role: string;
  series: string | null;
  seriesNumber: number | null;
  readStatus: "unread" | "partly_read" | "read";
  copies: { id: string; format: CopyFormat; source: CopySource }[];
  coverUrl: string | null;
};

export type Author = {
  id: string;
  name: string;
  website: string | null;
  checkedAt: string | null;
  identities: IdentityValue[];
  books: AuthorBook[];
};

type Row = {
  id: string;
  name: string;
  website: string | null;
  identity_checked_at: string | null;
  author_identities: {
    id: string;
    category: IdentityCategory;
    value: string;
    source: string;
    source_url: string | null;
    quote: string | null;
    confirmed: boolean;
  }[];
  credits: {
    role: string;
    titles: {
      id: string;
      title: string;
      read_status: AuthorBook["readStatus"];
      series_number: number | null;
      series: { name: string } | null;
      copies: { id: string; format: CopyFormat; source: CopySource; cover_url: string | null; cover_path?: string | null; gone_at: string | null }[];
    } | null;
  }[];
};

const ROLE_ORDER = ["author", "writer", "artist", "editor", "translator", "narrator"];

// One author: what they've said about themselves, and their books she owns.
// shared: the view-only link (no private cover photos; RLS shows it only
// confirmed values).
export async function loadAuthor(
  supabase: SupabaseClient,
  id: string,
  { shared = false }: { shared?: boolean } = {},
): Promise<Author | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from("people")
    .select(
      `id, name, website, identity_checked_at,
       author_identities(id, category, value, source, source_url, quote, confirmed),
       credits(role, titles(id, title, read_status, series_number, series(name),
         copies(id, format, source, cover_url, ${shared ? "" : "cover_path,"} gone_at)))`,
    )
    .eq("id", id)
    .maybeSingle<Row>();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const seen = new Set<string>();
  const books: (AuthorBook & { photo: string | null })[] = [];
  for (const c of data.credits) {
    const t = c.titles;
    if (!t || seen.has(t.id)) continue;
    const owned = t.copies.filter((k) => !k.gone_at);
    if (!owned.length) continue;
    seen.add(t.id);
    const photo = owned.find((k) => k.cover_path)?.cover_path ?? null;
    books.push({
      id: t.id,
      title: t.title,
      role: c.role,
      series: t.series?.name ?? null,
      seriesNumber: t.series_number,
      readStatus: t.read_status,
      copies: owned.map((k) => ({ id: k.id, format: k.format, source: k.source })),
      coverUrl: owned.find((k) => k.cover_url)?.cover_url ?? null,
      photo,
    });
  }
  const signed = await signCoverPaths(supabase, books.flatMap((b) => (b.photo ? [b.photo] : [])));

  return {
    id: data.id,
    name: data.name,
    website: data.website,
    checkedAt: data.identity_checked_at,
    identities: data.author_identities
      .map((i) => ({
        id: i.id,
        category: i.category,
        value: i.value,
        source: i.source,
        sourceUrl: i.source_url,
        quote: i.quote,
        confirmed: i.confirmed,
      }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    books: books
      .map(({ photo, ...b }) => ({ ...b, coverUrl: photo ? (signed.get(photo) ?? b.coverUrl) : b.coverUrl }))
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
          (a.series ?? "￿").localeCompare(b.series ?? "￿") ||
          (a.seriesNumber ?? 999) - (b.seriesNumber ?? 999) ||
          a.title.localeCompare(b.title),
      ),
  };
}
