"use client";

import { useState } from "react";
import type { CopyFormat, LibraryBook } from "@/lib/library";
import {
  FLAGS,
  SORTS,
  SOURCE_LABEL,
  activeCount,
  type FlagKey,
  type Filters,
  type ListKey,
  type SortKey,
  type filterOptions,
} from "@/lib/library-filters";

const STATUS: [LibraryBook["readStatus"], string][] = [
  ["unread", "Unread"],
  ["partly_read", "Partly read"],
  ["read", "Read"],
];

const FORMAT_FILTER_LABEL: Record<CopyFormat, string> = {
  hardcover: "Hardcover",
  trade_paperback: "Trade paperback",
  mass_market: "Mass-market",
  print_unknown: "Print (type not set)",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

type Options = ReturnType<typeof filterOptions>;

export function LibraryFilterBar({
  filters,
  options,
  shown,
  total,
  onChange,
}: {
  filters: Filters;
  options: Options;
  shown: number;
  total: number;
  onChange: (change: (current: Filters) => Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = activeCount(filters);

  const toggle = (key: ListKey, value: string) =>
    onChange((f) => {
      const list = f[key] as string[];
      return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  const clearAll = () =>
    onChange((f) => ({ ...f, status: [], format: [], genre: [], shelf: [], source: [], series: [], flag: [] }));

  // Chips for what's currently applied, each removable with one tap.
  const applied: { key: ListKey; value: string; label: string }[] = [
    ...filters.status.map((v) => ({ key: "status" as const, value: v, label: STATUS.find((s) => s[0] === v)?.[1] ?? v })),
    ...filters.format.map((v) => ({ key: "format" as const, value: v, label: FORMAT_FILTER_LABEL[v] ?? v })),
    ...filters.genre.map((v) => ({ key: "genre" as const, value: v, label: v })),
    ...filters.shelf.map((v) => ({ key: "shelf" as const, value: v, label: v })),
    ...filters.source.map((v) => ({ key: "source" as const, value: v, label: SOURCE_LABEL[v] ?? v })),
    ...filters.series.map((v) => ({ key: "series" as const, value: v, label: `Series: ${v}` })),
    ...filters.flag.map((v) => ({ key: "flag" as const, value: v, label: FLAGS[v] })),
  ];

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search your library</span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => {
              const q = e.target.value;
              onChange((f) => ({ ...f, q }));
            }}
            placeholder="Search title, author, series"
            className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
            open || active ? "border-accent bg-accent-soft" : "border-border bg-surface"
          }`}
        >
          Filters{active ? ` (${active})` : ""}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {shown === total ? `${total.toLocaleString()} books` : `${shown.toLocaleString()} of ${total.toLocaleString()} books`}
        </p>
        <label className="flex items-center gap-2 text-muted">
          Sort
          <select
            value={filters.sort}
            onChange={(e) => {
              const sort = e.target.value as SortKey;
              onChange((f) => ({ ...f, sort }));
            }}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-foreground"
          >
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Shown only while the panel is closed, so taps in the panel never shift it. */}
      {!open && applied.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {applied.map((a) => (
            <button
              key={`${a.key}:${a.value}`}
              type="button"
              onClick={() => toggle(a.key, a.value)}
              className="rounded-full bg-accent-soft px-3 py-1.5 text-xs"
              aria-label={`Remove filter ${a.label}`}
            >
              {a.label} ✕
            </button>
          ))}
          <button type="button" onClick={clearAll} className="px-2 py-1.5 text-xs text-accent underline-offset-4 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {open && (
        <div className="space-y-5 rounded-3xl border border-border bg-surface p-4">
          <Group title="Read status">
            {STATUS.map(([v, label]) => (
              <Chip key={v} on={filters.status.includes(v)} onClick={() => toggle("status", v)}>
                {label}
              </Chip>
            ))}
          </Group>
          <Group title="Format">
            {options.format.map(([v, n]) => (
              <Chip key={v} on={filters.format.includes(v as CopyFormat)} onClick={() => toggle("format", v)} count={n}>
                {FORMAT_FILTER_LABEL[v as CopyFormat] ?? v}
              </Chip>
            ))}
          </Group>
          <Group title="Genre" note="Rough, from the shelf photos. Ebooks and audiobooks get genres in Phase 2.">
            {options.genre.map(([v, n]) => (
              <Chip key={v} on={filters.genre.includes(v)} onClick={() => toggle("genre", v)} count={n}>
                {v}
              </Chip>
            ))}
          </Group>
          <Group title="Shelf">
            {options.shelf.map(([v, n]) => (
              <Chip key={v} on={filters.shelf.includes(v)} onClick={() => toggle("shelf", v)} count={n}>
                {v}
              </Chip>
            ))}
          </Group>
          <Group title="Where it came from">
            {options.source.map(([v, n]) => (
              <Chip key={v} on={filters.source.includes(v)} onClick={() => toggle("source", v)} count={n}>
                {SOURCE_LABEL[v] ?? v}
              </Chip>
            ))}
          </Group>
          <Group title="Series">
            <select
              value=""
              onChange={(e) => e.target.value && toggle("series", e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
            >
              <option value="">Choose a series…</option>
              {options.series
                .filter(([v]) => !filters.series.includes(v))
                .map(([v, n]) => (
                  <option key={v} value={v}>
                    {v} ({n})
                  </option>
                ))}
            </select>
          </Group>
          <Group title="Other">
            {(Object.keys(FLAGS) as FlagKey[]).map((v) => (
              <Chip key={v} on={filters.flag.includes(v)} onClick={() => toggle("flag", v)}>
                {FLAGS[v]}
              </Chip>
            ))}
          </Group>
          <div className="flex justify-between">
            <button type="button" onClick={clearAll} className="text-sm text-accent underline-offset-4 hover:underline">
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent"
            >
              Show {shown.toLocaleString()} books
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{title}</legend>
      {note && <p className="text-xs text-muted">{note}</p>}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  on,
  onClick,
  count,
  children,
}: {
  on: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs ${
        on ? "border-accent bg-accent text-on-accent" : "border-border bg-background hover:bg-accent-soft"
      }`}
    >
      {children}
      {count != null && <span className="ml-1 opacity-70">{count}</span>}
    </button>
  );
}
