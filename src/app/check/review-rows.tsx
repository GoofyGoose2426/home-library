"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReviewRow } from "@/lib/review";
import { REVIEW_FIELDS, SOURCE_NAME } from "@/lib/review-fields";
import { confirmAll, reviewItem } from "./actions";

const LABEL = new Map(REVIEW_FIELDS.map((f) => [f.key, f]));

export function ReviewRows({ rows, showTitle }: { rows: ReviewRow[]; showTitle: boolean }) {
  return (
    <ul className="mt-3 space-y-2">
      {rows.map((r) => (
        <li key={`${r.key}:${r.id}:${r.titleId}`}>
          <Row row={r} showTitle={showTitle} />
        </li>
      ))}
    </ul>
  );
}

function Row({ row: r, showTitle }: { row: ReviewRow; showTitle: boolean }) {
  const field = LABEL.get(r.key)!;
  const [done, setDone] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.value ?? "");
  const [more, setMore] = useState(false);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = field.kind !== "tag" && field.kind !== "series" && field.kind !== "choice";

  function act(action: "confirm" | "edit" | "reject", value: string | null, label: string) {
    setMessage(null);
    startBusy(async () => {
      const res = await reviewItem(action, r.key, r.id, r.titleId, value);
      if (!res.ok) return setMessage(res.error);
      setDone(label);
    });
  }

  if (done) {
    return (
      <p className="rounded-xl border border-border px-3 py-2 text-sm text-muted">
        {done} · {showTitle ? r.title : field.label}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        {showTitle ? (
          <Link href={`/books/${r.titleId}`} className="font-medium underline-offset-4 hover:underline">
            {r.title}
          </Link>
        ) : (
          <span className="font-medium">{field.label.replace(/s$/, "")}</span>
        )}
        <span className="text-xs text-muted">
          {r.detail ? `${r.detail} · ` : ""}from {SOURCE_NAME[r.source] ?? r.source}
        </span>
      </div>

      {editing ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            act("edit", draft, "Saved as yours");
          }}
        >
          {field.kind === "long" ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              maxLength={5000}
              aria-label={field.label}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-base"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              inputMode={field.kind === "number" ? "numeric" : undefined}
              aria-label={field.label}
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-base"
            />
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="min-h-10 rounded-full bg-accent px-4 font-medium text-on-accent disabled:opacity-60">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="min-h-10 rounded-full border border-border px-4">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className={`mt-1.5 whitespace-pre-line ${field.kind === "long" && !more ? "line-clamp-4" : ""}`}>
            {r.value ?? <span className="text-muted">(empty)</span>}
          </p>
          {field.kind === "long" && (r.value?.length ?? 0) > 280 && (
            <button type="button" onClick={() => setMore((m) => !m)} className="text-xs text-accent">
              {more ? "Less" : "More"}
            </button>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act("confirm", null, "Confirmed")}
              className="min-h-9 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-60"
            >
              ✓ Confirm
            </button>
            {canEdit && (
              <button type="button" disabled={busy} onClick={() => setEditing(true)} className="min-h-9 rounded-full border border-border px-4 text-sm">
                Edit
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => act("reject", null, "Rejected")}
              className="min-h-9 rounded-full border border-border px-4 text-sm text-muted"
            >
              ✕ Reject
            </button>
          </div>
        </>
      )}
      {message && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}

export function ConfirmAll({ fieldKey, label, count }: { fieldKey: string; label: string; count: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (asking) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <span>Confirm all {count.toLocaleString()}?</span>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            startBusy(async () => {
              const r = await confirmAll(fieldKey);
              if (!r.ok) return setMessage(r.error);
              setAsking(false);
              router.refresh();
            })
          }
          className="min-h-9 rounded-full bg-accent px-4 font-medium text-on-accent disabled:opacity-60"
        >
          {busy ? "Confirming…" : "Yes"}
        </button>
        <button type="button" disabled={busy} onClick={() => setAsking(false)} className="min-h-9 rounded-full border border-border px-3">
          No
        </button>
        {message && <span className="text-xs text-accent">{message}</span>}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setAsking(true)}
      aria-label={`Confirm all ${label}`}
      className="min-h-9 shrink-0 rounded-full border border-border px-4 text-sm hover:bg-accent-soft"
    >
      Confirm all
    </button>
  );
}
