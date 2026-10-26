"use client";

import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { removeCover } from "./actions";

export type CoverRow = {
  id: string;
  title: string;
  authors: string[];
  url: string | null;
  confirmed: boolean;
};

export function CoverCheck({ rows: initial }: { rows: CoverRow[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<"found" | "missing">("found");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const found = rows.filter((r) => r.url);
  const missing = rows.filter((r) => !r.url);
  const shown = tab === "found" ? found : missing;

  function remove(id: string) {
    const before = rows;
    setSelected(null);
    setError(null);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, url: null, confirmed: false } : r)));
    removeCover(id).catch(() => {
      setRows(before);
      setError("Couldn't remove that cover. Check your connection and try again.");
    });
  }

  return (
    <>
      <div className="mt-6 flex gap-2" role="tablist">
        <Tab active={tab === "found"} onClick={() => setTab("found")}>
          With a cover ({found.length})
        </Tab>
        <Tab active={tab === "missing"} onClick={() => setTab("missing")}>
          No cover yet ({missing.length})
        </Tab>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          {error}
        </p>
      )}
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {shown.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => r.url && setSelected(selected === r.id ? null : r.id)}
              className="block w-full text-left"
              aria-label={r.url ? `${r.title}: tap to remove if wrong` : r.title}
            >
              <BookCover title={r.title} authors={r.authors} url={r.url} unconfirmed={!!r.url && !r.confirmed} />
            </button>
            <p className="mt-1 line-clamp-2 text-xs">{r.title}</p>
            {selected === r.id && (
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="mt-1 w-full rounded-xl bg-accent px-2 py-2 text-xs font-medium text-on-accent"
              >
                Wrong cover, remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 py-2 text-sm ${
        active ? "bg-accent text-on-accent" : "border border-border bg-background"
      }`}
    >
      {children}
    </button>
  );
}
