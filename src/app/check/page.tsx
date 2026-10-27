import { Suspense } from "react";
import Link from "next/link";
import { loadWaiting, withValues, type ReviewItem } from "@/lib/review";
import { REVIEW_FIELDS, SOURCE_NAME } from "@/lib/review-fields";
import { createClient } from "@/lib/supabase/server";
import { ConfirmAll, ReviewRows } from "./review-rows";

export const metadata = { title: "To check · Home Library" };

const PER_PAGE = 20;
const BOOKS_PER_PAGE = 10;

export default function CheckPage({ searchParams }: PageProps<"/check">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">To check</h1>
      <p className="mt-2 text-muted">
        Details filled in for you that you haven&apos;t confirmed yet. <strong className="font-medium text-foreground">Confirm</strong>{" "}
        keeps a value, <strong className="font-medium text-foreground">Edit</strong> makes it yours, and{" "}
        <strong className="font-medium text-foreground">Reject</strong> clears it for good: no later look-up brings it back.
      </p>
      <Suspense fallback={<p className="mt-6 text-muted">Gathering what&apos;s waiting…</p>}>
        <Waiting searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Waiting({ searchParams }: Pick<PageProps<"/check">, "searchParams">) {
  const params = await searchParams;
  const field = typeof params.field === "string" ? params.field : null;
  const byBook = params.view === "books";
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();
  const items = await loadWaiting(supabase);

  const tabs = (
    <div className="mt-6 flex gap-2" role="tablist">
      <Link
        href="/check"
        role="tab"
        aria-selected={!byBook}
        className={`min-h-10 rounded-full border px-4 py-2 text-sm ${!byBook ? "border-accent bg-accent text-on-accent" : "border-border bg-surface"}`}
      >
        By field
      </Link>
      <Link
        href="/check?view=books"
        role="tab"
        aria-selected={byBook}
        className={`min-h-10 rounded-full border px-4 py-2 text-sm ${byBook ? "border-accent bg-accent text-on-accent" : "border-border bg-surface"}`}
      >
        By book
      </Link>
    </div>
  );

  if (!items.length) {
    return (
      <>
        {tabs}
        <p className="mt-8 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-muted">All checked. Nothing is waiting.</p>
      </>
    );
  }

  if (byBook) {
    const books = new Map<string, ReviewItem[]>();
    for (const i of items) books.set(i.titleId, [...(books.get(i.titleId) ?? []), i]);
    const ids = [...books.keys()];
    const slice = ids.slice((page - 1) * BOOKS_PER_PAGE, page * BOOKS_PER_PAGE);
    const rows = await withValues(supabase, slice.flatMap((id) => books.get(id)!));
    return (
      <>
        {tabs}
        <p className="mt-4 text-sm text-muted">
          {ids.length.toLocaleString()} books with something to check.
        </p>
        <ul className="mt-3 space-y-4">
          {slice.map((id) => {
            const own = rows.filter((r) => r.titleId === id);
            return (
              <li key={id} className="rounded-2xl border border-border bg-surface p-3">
                <Link href={`/books/${id}`} className="font-medium underline-offset-4 hover:underline">
                  {own[0]?.title}
                </Link>
                <ReviewRows rows={own} showTitle={false} />
              </li>
            );
          })}
        </ul>
        <Pages page={page} pages={Math.ceil(ids.length / BOOKS_PER_PAGE)} href={(p) => `/check?view=books&page=${p}`} />
      </>
    );
  }

  const counts = REVIEW_FIELDS.map((f) => ({ ...f, items: items.filter((i) => i.key === f.key) })).filter((f) => f.items.length);

  if (field) {
    const f = counts.find((c) => c.key === field);
    if (!f) {
      return (
        <>
          {tabs}
          <p className="mt-6 text-muted">Nothing left to check here. <Link href="/check" className="text-accent underline">Back to the list</Link></p>
        </>
      );
    }
    const slice = f.items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const rows = await withValues(supabase, slice);
    return (
      <>
        {tabs}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold">
            {f.label} <span className="text-base font-normal text-muted">({f.items.length.toLocaleString()})</span>
          </h2>
          <ConfirmAll fieldKey={f.key} label={f.label} count={f.items.length} />
        </div>
        {f.note && <p className="mt-1 text-sm text-muted">{f.note}.</p>}
        <ReviewRows rows={rows} showTitle />
        <Pages page={page} pages={Math.ceil(f.items.length / PER_PAGE)} href={(p) => `/check?field=${encodeURIComponent(f.key)}&page=${p}`} />
      </>
    );
  }

  return (
    <>
      {tabs}
      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
        {counts.map((f) => {
          const sources = [...new Set(f.items.map((i) => SOURCE_NAME[i.source] ?? i.source))].join(", ");
          return (
            <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <Link href={`/check?field=${encodeURIComponent(f.key)}`} className="min-w-0 flex-1">
                <span className="font-medium underline-offset-4 hover:underline">{f.label}</span>
                <span className="block text-xs text-muted">
                  {f.items.length.toLocaleString()} · from {sources}
                </span>
              </Link>
              <ConfirmAll fieldKey={f.key} label={f.label} count={f.items.length} />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Covers have their own page: <Link href="/covers" className="text-accent underline-offset-4 hover:underline">Check covers</Link>.
      </p>
    </>
  );
}

function Pages({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pages">
      {page > 1 ? <Link href={href(page - 1)} className="rounded-full border border-border px-4 py-2">← Previous</Link> : <span />}
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? <Link href={href(page + 1)} className="rounded-full border border-border px-4 py-2">Next →</Link> : <span />}
    </nav>
  );
}
