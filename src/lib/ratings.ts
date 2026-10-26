// Alexandra's rating scales (rating-scales.xlsx, v2). Her wording; don't edit
// labels or descriptions without asking her.

export type Scale<K extends string | number> = { value: K; label: string; description: string }[];

// Stars: 1.00–5.00 in quarter steps, each with its own label.
export const STARS: Scale<number> = [
  { value: 5, label: "All-time favourite", description: "It got under my skin and I'll always own it. Made me cry, made me laugh, made me feel all the feels. Comfort-read territory." },
  { value: 4.75, label: "Almost perfect", description: "Loved it. I'd only change a few small things to make it perfect." },
  { value: 4.5, label: "Adored it", description: "Wonderful and moving. A few things I'd change, or it's a bit niche." },
  { value: 4.25, label: "A great book", description: "Enjoyed it a lot. High quality throughout." },
  { value: 4, label: "Loved it", description: "A genuinely great reading experience." },
  { value: 3.75, label: "Almost loved it", description: "Really good, with a couple of things holding it back." },
  { value: 3.5, label: "Really enjoyed it", description: "Entertaining and a good time, not a waste of time. Can be light, fluffy or predictable." },
  { value: 3.25, label: "Enjoyed it", description: "It was good, but it didn't meet my needs or break my brain. Not one I'd go out of my way to recommend." },
  { value: 3, label: "Liked it", description: "Enjoyable and fun. It did its job." },
  { value: 2.75, label: "Mixed feelings", description: "Parts worked, parts really didn't." },
  { value: 2.5, label: "Meh", description: "Didn't love it." },
  { value: 2.25, label: "It wasn't great", description: "Glad it's over." },
  { value: 2, label: "Struggled with it", description: "More frustrating than enjoyable." },
  { value: 1.75, label: "Disappointing", description: "A few good bits in a book I mostly didn't like." },
  { value: 1.5, label: "Really didn't like it", description: "I kept going, but I regret it a bit." },
  { value: 1.25, label: "Almost hated it", description: "Very little worked for me, but I didn't hate it enough to quit." },
  { value: 1, label: "Hated it", description: "Not for me at all. Couldn't (or barely) finish it. I want my time back." },
];

export const WRITING: Scale<number> = [
  { value: 5, label: "Masterful", description: "Beautiful prose; the words stuck with me. Clearly very well thought out, with great world-building and all that jazz." },
  { value: 4, label: "Strong", description: "Well written and confident. A good-quality book." },
  { value: 3, label: "Fine", description: "It was okay. Not groundbreaking." },
  { value: 2, label: "Rough", description: "Maybe a good premise, but bad follow-through." },
  { value: 1, label: "Yikes", description: "Very poorly written. A third grader could've done better." },
];

export type Recommendation = "no" | "everyone" | "specific";
export const RECOMMEND: Scale<Recommendation> = [
  { value: "no", label: "No", description: "I wouldn't recommend it." },
  { value: "everyone", label: "Yes, to everyone", description: "I'd recommend it to anyone." },
  { value: "specific", label: "Yes, to specific people", description: "Only to the right reader." },
];

export const AUDIO: Scale<number> = [
  { value: 5, label: "Elevated the book", description: "The narration made it better than reading it myself." },
  { value: 4, label: "Great narration", description: "Engaging voices and pacing; easy to listen to." },
  { value: 3, label: "Fine", description: "Did the job; nothing stood out." },
  { value: 2, label: "Distracting", description: "Voices, pacing or production pulled me out of the story." },
  { value: 1, label: "Unlistenable", description: "The narration ruined it for me." },
];

export function find<K extends string | number>(scale: Scale<K>, value: K | null | undefined) {
  return value == null ? undefined : scale.find((s) => s.value === value);
}

export function starLabel(rating: number | null) {
  return find(STARS, rating)?.label ?? null;
}

// Shows 3.5 as "3.50", the way her scale writes it.
export function starText(rating: number) {
  return rating.toFixed(2);
}

export function isQuarterStar(rating: number) {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating * 4);
}
