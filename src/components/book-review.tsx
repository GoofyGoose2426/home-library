"use client";

import { useState, useTransition } from "react";
import { setTitleReview, type TitleReviewPatch } from "@/app/edit-actions";
import { SPICE, labelOf, type Spice } from "@/lib/classification";
import { MOOD_GROUPS, moodLabel } from "@/lib/moods";
import type { TitleReview } from "@/lib/book";

// Her review of a book, under its stars: the written review, broke my brain,
// mood reactions, would re-read, favourite quote and confirmed spice. Taps
// save straight away; the two text boxes save with one Save button.

const chip = (on: boolean) =>
  `min-h-9 rounded-full border px-3 text-sm ${on ? "border-accent bg-accent text-on-accent" : "border-border bg-background"}`;
const box = "mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-base";

export function BookReviewEditor({
  titleId,
  review,
  showSpice,
  suggestedSpice,
  startOpen,
}: {
  titleId: string;
  review: TitleReview;
  // Romance, or a romantic subplot: the Scoville Smut Scale applies.
  showSpice: boolean;
  // The spice from classification, when it isn't hers yet.
  suggestedSpice: string | null;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [v, setV] = useState(review);
  const [body, setBody] = useState(review.body ?? "");
  const [quote, setQuote] = useState(review.favouriteQuote ?? "");
  const [saved, setSaved] = useState({ body: review.body ?? "", quote: review.favouriteQuote ?? "" });
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(patch: TitleReviewPatch, next: TitleReview) {
    const before = v;
    setV(next);
    setMessage(null);
    start(async () => {
      const r = await setTitleReview(titleId, patch);
      if (!r.ok) {
        setV(before);
        setMessage(r.error);
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent">
        Write a review
      </button>
    );
  }

  const textChanged = body !== saved.body || quote !== saved.quote;
  const toggleMood = (k: string) => {
    const moods = v.moods.includes(k) ? v.moods.filter((m) => m !== k) : [...v.moods, k];
    save({ moods }, { ...v, moods });
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-4">
      <div>
        <label htmlFor="review-body" className="text-sm font-medium">
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={50000}
          placeholder="What you thought, what stayed with you…"
          className={box}
        />
      </div>

      <div>
        <p className="text-sm font-medium">Did it…</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={v.brokeMyBrain === true}
            onClick={() => save({ brokeMyBrain: v.brokeMyBrain ? null : true }, { ...v, brokeMyBrain: v.brokeMyBrain ? null : true })}
            className={chip(v.brokeMyBrain === true)}
          >
            Break my brain / challenge my worldview
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Would you re-read it?</p>
        <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Would re-read">
          {([true, false] as const).map((yes) => (
            <button
              key={String(yes)}
              type="button"
              role="radio"
              aria-checked={v.wouldReread === yes}
              onClick={() => {
                const next = v.wouldReread === yes ? null : yes;
                save({ wouldReread: next }, { ...v, wouldReread: next });
              }}
              className={chip(v.wouldReread === yes)}
            >
              {yes ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Mood reactions</p>
        <p className="text-xs text-muted">Tap any that fit.</p>
        {MOOD_GROUPS.map((g) => (
          <div key={g.title} className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</p>
            {"note" in g && <p className="text-xs text-muted">{g.note}</p>}
            <div className="mt-1.5 flex flex-wrap gap-2">
              {g.moods.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={v.moods.includes(k)} onClick={() => toggleMood(k)} className={chip(v.moods.includes(k))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="review-quote" className="text-sm font-medium">
          Favourite quote
        </label>
        <textarea id="review-quote" value={quote} onChange={(e) => setQuote(e.target.value)} rows={3} maxLength={5000} className={box} />
      </div>

      {textChanged && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const next = { body, quote };
            setMessage(null);
            start(async () => {
              const r = await setTitleReview(titleId, { body: next.body, favouriteQuote: next.quote });
              if (r.ok) setSaved(next);
              else setMessage(r.error);
            });
          }}
          className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save review and quote"}
        </button>
      )}

      {showSpice && (
        <fieldset>
          <legend className="text-sm font-medium">Confirmed spice</legend>
          <p className="text-xs text-muted">
            The Scoville Smut Scale, now that you&apos;ve read it. It replaces the suggested spice.
            {!v.confirmedSpice && suggestedSpice && <> Suggested: {labelOf(SPICE, suggestedSpice as Spice)}.</>}
          </p>
          <ul className="mt-2 space-y-1.5">
            {SPICE.map(([value, label, description]) => (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={v.confirmedSpice === value}
                  onClick={() => {
                    const next = v.confirmedSpice === value ? null : value;
                    save({ confirmedSpice: next }, { ...v, confirmedSpice: next });
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    v.confirmedSpice === value ? "border-accent bg-accent-soft" : "border-border bg-background"
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-muted">{description}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {message && (
        <p role="alert" className="text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}

// The view-only link: what she wrote, nothing to change.
export function BookReviewView({ review }: { review: TitleReview }) {
  const moods = review.moods.map(moodLabel).filter(Boolean);
  if (!review.body && !moods.length && !review.favouriteQuote && review.brokeMyBrain == null && review.wouldReread == null) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
      {review.body && <p className="whitespace-pre-line leading-relaxed">{review.body}</p>}
      {review.brokeMyBrain && <p className="font-medium">Broke my brain / challenged my worldview</p>}
      {review.wouldReread != null && <p className="text-muted">Would re-read: {review.wouldReread ? "Yes" : "No"}</p>}
      {moods.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {moods.map((m) => (
            <li key={m} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs">
              {m}
            </li>
          ))}
        </ul>
      )}
      {review.favouriteQuote && (
        <blockquote className="border-l-2 border-accent pl-3 italic leading-relaxed">{review.favouriteQuote}</blockquote>
      )}
    </div>
  );
}
