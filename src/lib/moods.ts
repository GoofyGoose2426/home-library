// Mood reactions for a review (docs/starter-lists.md section 8, approved by
// Alexandra 2026-11-10). Her wording; don't change labels without asking her.
// Stored by key, so a label can be reworded without touching saved reviews.

export const MOOD_GROUPS = [
  {
    title: "Feel-good",
    moods: [
      ["laughed", "Laughed out loud"],
      ["swooned", "Swooned"],
      ["cozy", "Cozy & comforted"],
      ["hopeful", "Hopeful"],
      ["inspired", "Inspired"],
      ["nostalgic", "Nostalgic"],
    ],
  },
  {
    title: "Big feelings",
    moods: [
      ["cried", "Cried"],
      ["heartbroken", "Heartbroken"],
      ["fired_up", "Angry / fired up"],
      ["hot_bothered", "Hot & bothered"],
    ],
  },
  {
    title: "Gripping",
    moods: [
      ["page_turner", "Page-turner (couldn't put it down)"],
      ["edge_of_seat", "On the edge of my seat"],
      ["twist", "Didn't see that coming"],
      ["scared", "Scared"],
      ["creeped_out", "Creeped out"],
      ["book_hangover", "Book hangover (still thinking about it)"],
    ],
  },
  {
    title: "Quieter",
    moods: [
      ["made_me_think", "Made me think"],
      ["slow_burn", "Slow burn that paid off"],
    ],
  },
  {
    // Parts that would have made it better had they been different. Not a
    // verdict on the book: she only keeps books she likes.
    title: "Room for growth",
    note: "Parts that would have made it even better",
    moods: [
      ["pacing", "Pacing dragged in places"],
      ["character", "A character frustrated me"],
      ["ending", "The ending could have been stronger"],
      ["confusing", "Hard to follow in places"],
    ],
  },
] as const satisfies readonly { title: string; note?: string; moods: readonly (readonly [string, string])[] }[];

export type Mood = (typeof MOOD_GROUPS)[number]["moods"][number][0];

export const MOODS: [Mood, string][] = MOOD_GROUPS.flatMap((g) => g.moods.map(([k, l]) => [k, l] as [Mood, string]));

export function isMood(v: unknown): v is Mood {
  return MOODS.some(([k]) => k === v);
}

export function moodLabel(k: string) {
  return MOODS.find(([key]) => key === k)?.[1] ?? null;
}
