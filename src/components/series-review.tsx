"use client";

import { useState, useTransition } from "react";
import { setSeriesReview } from "@/app/edit-actions";
import { ScalePicker, StarPicker } from "@/components/quick-edit";
import { RECOMMEND, STARS, WRITING, find, starText } from "@/lib/ratings";
import type { SeriesReview } from "@/lib/series";

// A review of the whole series, beside each book's own: stars, writing,
// recommendation and notes, on her own scales. Stars save as soon as she
// taps them; notes save with the Save button.

export function SeriesReviewEditor({ seriesId, review }: { seriesId: string; review: SeriesReview | null }) {
  const [rating, setRating] = useState(review?.rating ?? null);
  const [writing, setWriting] = useState(review?.writingQuality ?? null);
  const [recommend, setRecommend] = useState(review?.recommendation ?? null);
  const [body, setBody] = useState(review?.body ?? "");
  const [savedBody, setSavedBody] = useState(review?.body ?? "");
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save(patch: Parameters<typeof setSeriesReview>[1], undo: () => void) {
    setMessage(null);
    start(async () => {
      const r = await setSeriesReview(seriesId, patch);
      if (!r.ok) {
        undo();
        setMessage(r.error);
      }
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4" aria-label="Series review">
      <h2 className="font-serif text-xl font-semibold">Your review of the series</h2>
      <p className="mt-1 text-xs text-muted">For the series as a whole. Each book keeps its own stars and review.</p>

      <h3 className="mt-4 text-sm font-medium">Stars</h3>
      <div className="mt-1">
        <StarPicker
          value={rating}
          onChange={(v) => {
            const before = [rating, writing, recommend] as const;
            setRating(v);
            if (v === null) {
              setWriting(null);
              setRecommend(null);
            }
            save({ rating: v }, () => {
              setRating(before[0]);
              setWriting(before[1]);
              setRecommend(before[2]);
            });
          }}
        />
      </div>

      {rating !== null && (
        <>
          <h3 className="mt-4 text-sm font-medium">Writing</h3>
          <div className="mt-1">
            <ScalePicker
              scale={WRITING}
              value={writing}
              numbered
              onChange={(v) => {
                const before = writing;
                setWriting(v);
                save({ writingQuality: v }, () => setWriting(before));
              }}
            />
          </div>
          <h3 className="mt-4 text-sm font-medium">Would you recommend it?</h3>
          <div className="mt-1">
            <ScalePicker
              scale={RECOMMEND}
              value={recommend}
              onChange={(v) => {
                const before = recommend;
                setRecommend(v);
                save({ recommendation: v }, () => setRecommend(before));
              }}
            />
          </div>
        </>
      )}

      <label className="mt-4 block text-sm font-medium" htmlFor="series-notes">
        Notes and commentary
      </label>
      <textarea
        id="series-notes"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={20000}
        placeholder="How the series holds up as a whole, favourite book, where it went wrong, who it's for…"
        className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-base"
      />
      {body !== savedBody && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const text = body;
            setMessage(null);
            start(async () => {
              const r = await setSeriesReview(seriesId, { body: text });
              if (r.ok) setSavedBody(text);
              else setMessage(r.error);
            });
          }}
          className="mt-2 min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save notes"}
        </button>
      )}
      {message && (
        <p role="alert" className="mt-2 text-xs text-accent">
          {message}
        </p>
      )}
    </section>
  );
}

// The view-only link: the review as written, nothing to change.
export function SeriesReviewView({ review }: { review: SeriesReview | null }) {
  const stars = find(STARS, review?.rating);
  const writing = find(WRITING, review?.writingQuality);
  const recommend = find(RECOMMEND, review?.recommendation);
  if (!review || (!stars && !review.body)) return null;
  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm" aria-label="Series review">
      <h2 className="font-serif text-xl font-semibold">Alexandra&apos;s review of the series</h2>
      {stars && (
        <p className="mt-2">
          <span className="text-accent">★</span> <strong>{starText(stars.value)}</strong> · {stars.label}
        </p>
      )}
      {writing && <p className="mt-1 text-muted">Writing: {writing.value} · {writing.label}</p>}
      {recommend && <p className="mt-1 text-muted">Recommend: {recommend.label}</p>}
      {review.body && <p className="mt-3 whitespace-pre-line leading-relaxed">{review.body}</p>}
    </section>
  );
}
