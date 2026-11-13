"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnswerView, UnpinAnswer } from "@/components/answer-view";
import { useViewMode } from "@/components/view-mode";
import type { PinnedReport } from "@/lib/reports";
import { BREAKDOWN_GROUPS, BREAKDOWNS, STATUSES, breakdown, libraryHref, type Row, type StatBook, type Status } from "@/lib/stats";

// Read / partly read / unread as a ring, then any field broken down as bars.
// Every slice, bar and number opens those books in the library.

const COLOR: Record<Status, string> = {
  read: "var(--stat-read)",
  partly_read: "var(--stat-partly)",
  unread: "var(--stat-unread)",
};
const SHORT: Record<Status, string> = { read: "read", partly_read: "partly read", unread: "unread" };

type Look = "all" | Status;
const LOOKS: [Look, string][] = [["all", "All books"], ...STATUSES.map((s) => [s.key, s.label] as [Look, string])];

// Whole percentages, with "<1" rather than 0 for a book or two.
const pct = (n: number, of: number) => {
  const p = of ? Math.round((n / of) * 100) : 0;
  return p === 0 && n > 0 ? "<1" : String(p);
};
const books = (n: number) => `${n.toLocaleString()} ${n === 1 ? "book" : "books"}`;

export function StatsView({ data, leftOut, pinned = [] }: { data: StatBook[]; leftOut: number; pinned?: PinnedReport[] }) {
  const { base, readOnly } = useViewMode();
  const params = useSearchParams();
  const [by, setBy] = useState(() => (BREAKDOWNS.some((d) => d.key === params.get("by")) ? params.get("by")! : "genre"));
  const [look, setLook] = useState<Look>(() => (LOOKS.some(([k]) => k === params.get("look")) ? (params.get("look") as Look) : "all"));
  const [scale, setScale] = useState<"count" | "share">(() => (params.get("scale") === "share" ? "share" : "count"));

  // Remember the choices in the address, so Back from the library returns here.
  function remember(next: { by?: string; look?: Look; scale?: string }) {
    const p = new URLSearchParams({ by, look, scale, ...next });
    if (p.get("look") === "all") p.delete("look");
    if (p.get("scale") === "count") p.delete("scale");
    window.history.replaceState(null, "", `?${p.toString()}`);
  }

  const counts = useMemo(() => {
    const c: Record<Status, number> = { read: 0, partly_read: 0, unread: 0 };
    for (const b of data) c[b.s]++;
    return c;
  }, [data]);

  if (!data.length) {
    return <p className="mt-6 text-muted">No books to count yet.</p>;
  }

  return (
    <div className="mt-6 space-y-8">
      <Split counts={counts} total={data.length} base={base} leftOut={leftOut} />

      {(pinned.length > 0 || !readOnly) && (
        <section aria-labelledby="pinned" className="space-y-4">
          <div>
            <h2 id="pinned" className="font-serif text-xl font-semibold">
              {readOnly ? "Pinned answers" : "Your pinned answers"}
            </h2>
            {!readOnly && (
              <p className="mt-1 text-sm text-muted">
                {pinned.length ? "Answers from Ask your library, worked out again from your books each time you open this page." : "Nothing pinned yet."}{" "}
                To ask your library a question, ask in a Claude session. You&apos;ll get a link to the answer, with a Pin to dashboard button.
              </p>
            )}
          </div>
          {pinned.map((r) => (
            <article key={r.id} className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-semibold">{r.name}</h3>
                  {r.question && r.question !== r.name && <p className="text-sm text-muted">&ldquo;{r.question}&rdquo;</p>}
                </div>
                {!readOnly && <UnpinAnswer id={r.id} name={r.name} />}
              </div>
              <AnswerView lookup={r.lookup} answer={r.answer} />
            </article>
          ))}
        </section>
      )}

      <section aria-labelledby="breakdown" className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
        <h2 id="breakdown" className="font-serif text-xl font-semibold">
          Break it down
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 basis-56 text-sm font-medium">
            By
            <select
              value={by}
              onChange={(e) => {
                setBy(e.target.value);
                remember({ by: e.target.value });
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
            >
              {BREAKDOWN_GROUPS.map((g) => (
                <optgroup key={g.title} label={g.title}>
                  {g.items.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Which books">
          {LOOKS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={look === k}
              onClick={() => {
                setLook(k);
                remember({ look: k });
              }}
              className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm ${look === k ? "border-accent bg-accent text-on-accent" : "border-border bg-background"}`}
            >
              {k !== "all" && <span aria-hidden className="size-2.5 rounded-full" style={{ background: COLOR[k] }} />}
              {label}
            </button>
          ))}
        </div>
        <Breakdown data={data} by={by} look={look} scale={scale} base={base} onScale={(s) => { setScale(s); remember({ scale: s }); }} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The main split, as a ring with a legend. Partly read is its own slice.

function Split({ counts, total, base, leftOut }: { counts: Record<Status, number>; total: number; base: string; leftOut: number }) {
  const size = 176;
  const r = 70;
  const stroke = 26;
  const circ = 2 * Math.PI * r;
  const shown = STATUSES.filter((s) => counts[s.key] > 0);
  // A small gap between slices, in the card's colour, when there's more than one.
  const gap = shown.length > 1 ? 3 : 0;
  const starts = shown.map((_, i) => shown.slice(0, i).reduce((sum, s) => sum + (counts[s.key] / total) * circ, 0));

  return (
    <section aria-labelledby="split" className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
      <h2 id="split" className="font-serif text-xl font-semibold">
        Read and unread
      </h2>
      <p className="mt-1 text-sm text-muted">
        {books(total)} you own
        {leftOut > 0 && <>, not counting {leftOut.toLocaleString()} reference and picture books</>}. Tap any part to see
        those books.
      </p>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:gap-10">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-44 shrink-0" role="img" aria-label="Read, partly read and unread">
          {shown.map((s, i) => {
            const len = (counts[s.key] / total) * circ;
            const dash = Math.max(len - gap, 1);
            const offset = -starts[i];
            return (
              <Link key={s.key} href={libraryHref(base, [s.key])} aria-label={`${STATUSES.find((x) => x.key === s.key)!.label}: ${books(counts[s.key])}`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={COLOR[s.key]}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>{`${s.label}: ${books(counts[s.key])} (${pct(counts[s.key], total)}%)`}</title>
                </circle>
              </Link>
            );
          })}
          <g>
            <text x="50%" y="47%" textAnchor="middle" className="fill-foreground font-serif text-[30px] font-semibold">
              {pct(counts.read, total)}%
            </text>
            <text x="50%" y="62%" textAnchor="middle" className="fill-muted text-[12px]">
              read
            </text>
          </g>
        </svg>
        <ul className="w-full space-y-2 sm:max-w-xs">
          {STATUSES.map((s) => (
            <li key={s.key}>
              <Link href={libraryHref(base, [s.key])} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent-soft">
                <span aria-hidden className="size-3.5 shrink-0 rounded-full" style={{ background: COLOR[s.key] }} />
                <span className="flex-1 font-medium">{s.label}</span>
                <span className="tabular-nums">{counts[s.key].toLocaleString()}</span>
                <span className="w-11 text-right text-sm tabular-nums text-muted">{pct(counts[s.key], total)}%</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={libraryHref(base, ["unread", "partly_read"])} className="block px-2 text-sm text-accent underline-offset-4 hover:underline">
              Everything still to read ({(counts.unread + counts.partly_read).toLocaleString()}) →
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One field, as bars. "All books" stacks read / partly read / unread in each
// bar; picking one side shows just those books.

const FIRST = 12;

function Breakdown({
  data,
  by,
  look,
  scale,
  base,
  onScale,
}: {
  data: StatBook[];
  by: string;
  look: Look;
  scale: "count" | "share";
  base: string;
  onScale: (s: "count" | "share") => void;
}) {
  const [showAll, setShowAll] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const d = BREAKDOWNS.find((x) => x.key === by)!;
  const side = look === "all" ? data : data.filter((b) => b.s === look);
  const { rows: all, without } = useMemo(() => breakdown(side, d), [side, d]);
  const rows = all
    .map((r) => ({ ...r, n: look === "all" ? r.total : r.counts[look] }))
    .filter((r) => r.n > 0);
  const expanded = showAll === `${by}:${look}`;
  // Lists with their own order (decades, stars, spice) always show in full.
  const long = !d.order && rows.length > FIRST;
  const visible = expanded || !long ? rows : rows.slice(0, FIRST);
  const max = Math.max(1, ...rows.map((r) => r.n));
  const sideLabel = look === "all" ? "books" : `${SHORT[look]} books`;
  const statuses: Status[] = look === "all" ? ["read", "partly_read", "unread"] : [look];
  // The biggest value, unless the list has its own order (then the first is not "top").
  const top = [...rows].sort((a, b) => b.n - a.n)[0];

  const showTip = (e: React.MouseEvent, text: string) => setTip({ x: e.clientX, y: e.clientY, text });

  return (
    <div className="mt-5">
      {top && side.length > 0 && (
        <p className="text-sm">
          {look === "all" ? (
            <>
              The most common is <strong>{top.label}</strong>: {books(top.n)}, of which {pct(top.counts.read, top.n)}% are read.
            </>
          ) : (
            <>
              Of your {side.length.toLocaleString()} {sideLabel}, <strong>{pct(top.n, side.length)}%</strong> are{" "}
              <strong>{top.label}</strong> ({top.n.toLocaleString()}).
            </>
          )}
        </p>
      )}

      {look === "all" && rows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Legend">
            {STATUSES.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: COLOR[s.key] }} />
                {s.label}
              </li>
            ))}
          </ul>
          <div className="ml-auto flex rounded-full border border-border p-0.5" role="radiogroup" aria-label="Bar length">
            {(
              [
                ["count", "Number of books"],
                ["share", "Share read"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={scale === k}
                onClick={() => onScale(k)}
                className={`min-h-7 rounded-full px-2.5 ${scale === k ? "bg-accent text-on-accent" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">None of these books has a value for this yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((r) => (
            <BarRow
              key={r.value}
              row={r}
              n={r.n}
              of={side.length}
              max={look === "all" && scale === "share" ? r.n : max}
              statuses={statuses}
              hrefFor={(s) => libraryHref(base, s, d, r.value)}
              onTip={showTip}
              onLeave={() => setTip(null)}
              look={look}
            />
          ))}
        </ul>
      )}

      {long && (
        <button
          type="button"
          onClick={() => setShowAll(expanded ? null : `${by}:${look}`)}
          className="mt-3 min-h-9 text-sm font-medium text-accent"
        >
          {expanded ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}

      <div className="mt-4 space-y-1 text-xs text-muted">
        {without > 0 && (
          <p>
            {books(without)} {without === 1 ? "has" : "have"} no {d.title.toLowerCase()} yet.
          </p>
        )}
        <p>A book with more than one value counts once in each, so the bars can add up to more than your total.</p>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-40 max-w-60 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

export function BarRow({
  row,
  n,
  of,
  max,
  statuses,
  hrefFor,
  onTip,
  onLeave,
  look,
}: {
  row: Row;
  n: number;
  of: number;
  max: number;
  statuses: Status[];
  // null when the library can't show exactly these books.
  hrefFor: (s: Status[]) => string | null;
  onTip: (e: React.MouseEvent, text: string) => void;
  onLeave: () => void;
  look: Look;
}) {
  const parts = statuses.filter((s) => row.counts[s] > 0);
  const rowHref = hrefFor(statuses);
  const head = (
    <>
      <span className="min-w-0 font-medium">{row.label}</span>
      <span className="shrink-0 tabular-nums text-muted">
        {n.toLocaleString()}
        {look === "all" ? <> · {pct(row.counts.read, n)}% read</> : <> · {pct(n, of)}%</>}
      </span>
    </>
  );
  const headClass = "flex items-baseline justify-between gap-3 text-sm";
  return (
    <li>
      {rowHref ? (
        <Link href={rowHref} className={`${headClass} hover:underline`}>
          {head}
        </Link>
      ) : (
        <p className={headClass}>{head}</p>
      )}
      <div className="mt-1 flex h-3.5 gap-0.5" style={{ width: `${Math.max((n / max) * 100, 1.5)}%` }}>
        {parts.map((s) => {
          const label = `${row.label} · ${STATUSES.find((x) => x.key === s)!.label}: ${books(row.counts[s])} (${pct(row.counts[s], n)}%)`;
          const href = hrefFor([s]);
          const props = {
            "aria-label": label,
            onMouseMove: (e: React.MouseEvent) => onTip(e, label),
            onMouseLeave: onLeave,
            className: "h-full min-w-1 first:rounded-l last:rounded-r hover:opacity-80",
            style: { flexGrow: row.counts[s], flexBasis: 0, background: COLOR[s] },
          };
          return href ? <Link key={s} href={href} {...props} /> : <span key={s} role="img" {...props} />;
        })}
      </div>
    </li>
  );
}
