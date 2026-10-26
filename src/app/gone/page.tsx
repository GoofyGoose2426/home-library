import { Suspense } from "react";
import Link from "next/link";
import { UndoGone } from "@/components/remove-copy";
import { GONE_LABEL, type GoneReason } from "@/lib/gone";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Gone list · Home Library" };

const COPY: Record<string, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market paperback",
  print_unknown: "Print",
};
const APP: Record<string, string> = { kobo: "Kobo", audible: "Audible", librofm: "Libro.fm", other: "Other" };

export default function GonePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Gone list</h1>
      <p className="mt-2 text-muted">
        Copies you&apos;ve sold, donated, given away or lost. A book with no copies left is out of your
        library and stats. Undo brings a copy back.
      </p>
      <Suspense fallback={<p className="mt-6 text-muted">Loading…</p>}>
        <GoneList />
      </Suspense>
    </main>
  );
}

type Row = {
  id: string;
  format: string;
  source: string;
  gone_at: string;
  gone_reason: GoneReason;
  titles: { id: string; title: string; credits: { role: string; position: number; people: { name: string } | null }[] };
};

async function GoneList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copies")
    .select("id, format, source, gone_at, gone_reason, titles(id, title, credits(role, position, people(name)))")
    .not("gone_at", "is", null)
    .order("gone_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  if (!rows.length) {
    return <p className="mt-8 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-muted">Nothing here yet.</p>;
  }
  return (
    <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
      {rows.map((r) => {
        const author = r.titles.credits
          .filter((c) => c.role !== "narrator" && c.people)
          .sort((a, b) => a.position - b.position)[0]?.people?.name;
        const copy = COPY[r.format] ? `${COPY[r.format]}, bookshelf` : `${APP[r.source] ?? "Other"} ${r.format}`;
        return (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-sm">
              <Link href={`/books/${r.titles.id}`} className="font-medium underline-offset-4 hover:underline">
                {r.titles.title}
              </Link>
              {author && <span className="text-muted"> · {author}</span>}
              <span className="block text-xs text-muted">
                {copy} · {GONE_LABEL[r.gone_reason]} {new Date(r.gone_at).toLocaleDateString("en-CA", { dateStyle: "medium" })}
              </span>
            </div>
            <UndoGone copyId={r.id} />
          </li>
        );
      })}
    </ul>
  );
}
