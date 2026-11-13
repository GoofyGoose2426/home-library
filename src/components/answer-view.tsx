"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { pinReport, unpinReport } from "@/app/edit-actions";
import { BarRow } from "@/components/stats-view";
import { useViewMode } from "@/components/view-mode";
import { MEASURES, describe, lookupHref, type Answer, type Lookup } from "@/lib/ask";
import { find, STARS, starText } from "@/lib/ratings";
import { BREAKDOWNS, STATUSES, type Status } from "@/lib/stats";

// One answer from Ask your library: a sentence, bars or a list, with the
// lookup in plain words underneath. Used on the answer page and for pinned
// answers on the Stats page.

const ALL: Status[] = ["read", "partly_read", "unread"];
const books = (n: number) => `${n.toLocaleString()} ${n === 1 ? "book" : "books"}`;
const statusLabel = (s: Status) => STATUSES.find((x) => x.key === s)!.label;
const avgText = (of: keyof typeof MEASURES, avg: number) => (of === "stars" ? `★ ${avg.toFixed(2)}` : `${avg.toFixed(1)} of 5`);

export function AnswerView({ lookup, answer }: { lookup: Lookup; answer: Answer }) {
  const { base } = useViewMode();
  const all = lookupHref(base, lookup);

  return (
    <div>
      {answer.type === "count" && (
        <div>
          <p className="font-serif text-4xl font-semibold">{answer.n.toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted">
            {ALL.filter((s) => answer.counts[s] > 0)
              .map((s) => `${answer.counts[s].toLocaleString()} ${statusLabel(s).toLowerCase()}`)
              .join(" · ") || "No books match."}
          </p>
        </div>
      )}

      {answer.type === "average" && (
        <div>
          <p className="font-serif text-4xl font-semibold">{answer.avg == null ? "—" : avgText(answer.of, answer.avg)}</p>
          <p className="mt-1 text-sm text-muted">
            {answer.avg == null ? "None of these books has a rating yet." : <>Average {MEASURES[answer.of].toLowerCase()}, from {books(answer.n)} you&apos;ve rated</>}
          </p>
          {answer.of === "stars" && answer.avg != null && (
            <p className="mt-1 text-sm">{find(STARS, Math.round(answer.avg * 4) / 4)?.label}</p>
          )}
        </div>
      )}

      {answer.type === "bars" && <Bars lookup={lookup} answer={answer} base={base} />}

      {answer.type === "average_bars" &&
        (answer.rows.length === 0 ? (
          <p className="text-sm text-muted">None of these books has a rating yet.</p>
        ) : (
          <ul className="space-y-3">
            {answer.rows.map((r) => (
              <li key={r.value}>
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 font-medium">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {avgText(answer.of, r.avg)} · {books(r.n)}
                  </span>
                </p>
                <div className="mt-1 h-3.5 rounded bg-accent" style={{ width: `${Math.max((r.avg / 5) * 100, 1.5)}%` }} />
              </li>
            ))}
          </ul>
        ))}

      {answer.type === "list" &&
        (answer.books.length === 0 ? (
          <p className="text-sm text-muted">No books match.</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              {books(answer.total)}
              {answer.total > answer.books.length && `, showing the first ${answer.books.length}`}
            </p>
            <ol className="mt-2 divide-y divide-border rounded-2xl border border-border">
              {answer.books.map((b) => (
                <li key={b.id}>
                  <Link href={`${base}/books/${b.id}`} className="flex items-baseline gap-3 px-3 py-2 text-sm hover:bg-accent-soft">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{b.title}</span>
                      {b.authors.length > 0 && <span className="text-muted"> · {b.authors.join(", ")}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {b.rating != null ? `★ ${starText(b.rating)}` : statusLabel(b.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ))}

      <p className="mt-4 text-xs text-muted">How this was worked out: {describe(lookup)}</p>
      {all && (answer.type === "count" || answer.type === "list") && (
        <Link href={all} className="mt-2 inline-block text-sm text-accent underline-offset-4 hover:underline">
          See these books in the library →
        </Link>
      )}
    </div>
  );
}

function Bars({ lookup, answer, base }: { lookup: Lookup; answer: Extract<Answer, { type: "bars" }>; base: string }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const d = BREAKDOWNS.find((x) => x.key === answer.by)!;
  const rows = answer.rows.slice(0, 30);
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) return <p className="text-sm text-muted">No books match.</p>;
  return (
    <>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Legend">
        {STATUSES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full" style={{ background: `var(--stat-${s.key === "partly_read" ? "partly" : s.key})` }} />
            {s.label}
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <BarRow
            key={r.value}
            row={r}
            n={r.total}
            of={answer.of}
            max={max}
            statuses={ALL}
            look="all"
            hrefFor={(s) => lookupHref(base, lookup, { d, value: r.value }, s.length === 3 ? undefined : s)}
            onTip={(e, text) => setTip({ x: e.clientX, y: e.clientY, text })}
            onLeave={() => setTip(null)}
          />
        ))}
      </ul>
      {answer.rows.length > rows.length && <p className="mt-2 text-xs text-muted">Showing the biggest 30 of {answer.rows.length}.</p>}
      {answer.without > 0 && (
        <p className="mt-2 text-xs text-muted">
          {books(answer.without)} {answer.without === 1 ? "has" : "have"} no {d.title.toLowerCase()} yet.
        </p>
      )}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-40 max-w-60 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </>
  );
}

// On the answer page: name it and pin it to the Stats page.
export function PinAnswer({ question, lookup, suggestedName }: { question: string; lookup: Lookup; suggestedName: string }) {
  const [name, setName] = useState(suggestedName);
  const [pinned, setPinned] = useState(false);
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (pinned) {
    return (
      <p className="text-sm">
        Pinned.{" "}
        <Link href="/stats" className="font-medium text-accent underline-offset-4 hover:underline">
          See it on your Stats page →
        </Link>
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <label htmlFor="pin-name" className="text-sm font-medium">
        Name on your Stats page
      </label>
      <input
        id="pin-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
        className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
      />
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={() => {
          setMessage(null);
          start(async () => {
            const r = await pinReport(name, question, lookup);
            if (r.ok) setPinned(true);
            else setMessage(r.error);
          });
        }}
        className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
      >
        {busy ? "Pinning…" : "Pin to dashboard"}
      </button>
      {message && (
        <p role="alert" className="text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}

// On the Stats page: take a pinned answer off (it asks first).
export function UnpinAnswer({ id, name }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="text-xs">
      {confirm ? (
        <p>
          Unpin &ldquo;{name}&rdquo;?{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await unpinReport(id);
                if (!r.ok) setMessage(r.error);
              })
            }
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Yes, unpin
          </button>{" "}
          <button type="button" onClick={() => setConfirm(false)} className="text-muted underline-offset-4 hover:underline">
            Cancel
          </button>
        </p>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="text-muted underline-offset-4 hover:underline">
          Unpin
        </button>
      )}
      {message && (
        <p role="alert" className="mt-1 text-accent">
          {message}
        </p>
      )}
    </div>
  );
}
