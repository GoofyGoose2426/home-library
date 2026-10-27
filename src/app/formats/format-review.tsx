"use client";

import Link from "next/link";
import { useState } from "react";
import { setPrintType } from "@/app/edit-actions";
import { BookCover } from "@/components/book-cover";

type PrintFormat = "hardcover" | "trade_paperback" | "mass_market" | "print_unknown";
export type PrintCopy = { id: string; format: PrintFormat; titleId: string; title: string; authors: string[]; coverUrl: string | null };

const GROUPS: [PrintFormat, string][] = [
  ["hardcover", "Hardcover"],
  ["trade_paperback", "Trade paperback"],
  ["mass_market", "Mass-market paperback"],
  ["print_unknown", "Type not set"],
];

export function FormatReview({ copies: initial }: { copies: PrintCopy[] }) {
  const [copies, setCopies] = useState(initial);
  const [open, setOpen] = useState<PrintFormat>("hardcover");
  const [message, setMessage] = useState<string | null>(null);

  function change(c: PrintCopy, format: PrintFormat) {
    setMessage(null);
    setCopies((list) => list.map((x) => (x.id === c.id ? { ...x, format } : x)));
    setPrintType([c.id], format).catch(() => {
      setCopies((list) => list.map((x) => (x.id === c.id ? { ...x, format: c.format } : x)));
      setMessage(`Couldn't change ${c.title}. Check your connection and try again.`);
    });
  }

  const shown = copies.filter((c) => c.format === open);
  return (
    <section className="mt-6">
      <div className="flex flex-wrap gap-2" role="tablist">
        {GROUPS.map(([f, label]) => {
          const n = copies.filter((c) => c.format === f).length;
          return (
            <button
              key={f}
              role="tab"
              aria-selected={open === f}
              onClick={() => setOpen(f)}
              className={`min-h-10 rounded-full border px-4 text-sm ${open === f ? "border-accent bg-accent text-on-accent" : "border-border bg-surface"}`}
            >
              {label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {message && (
        <p role="alert" className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}
      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted">None.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/books/${c.titleId}`}>
                <BookCover title={c.title} authors={c.authors} url={c.coverUrl} />
              </Link>
              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{c.title}</p>
              <select
                value={c.format}
                onChange={(e) => change(c, e.target.value as PrintFormat)}
                aria-label={`Print type for ${c.title}`}
                className="mt-1 w-full rounded-lg border border-border bg-background px-1.5 py-1.5 text-xs"
              >
                {GROUPS.map(([f, label]) => (
                  <option key={f} value={f}>
                    {label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
