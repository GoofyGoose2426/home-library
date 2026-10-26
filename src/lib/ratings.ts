// Alexandra's star scale. Ratings go in quarter stars; the label is the one
// for the whole stars reached (4.75 shows the 4-star label).
export const STAR_LABELS: Record<number, string> = {
  5: "I'd tell everyone to read this",
  4: "Loved it, but it's not for everyone",
  3: "Fun, I liked it, but I wouldn't necessarily recommend it",
  2: "It wasn't great",
  1: "I hated it",
};

export function starLabel(rating: number | null) {
  if (rating == null) return null;
  return STAR_LABELS[Math.max(1, Math.floor(rating))];
}

export function isQuarterStar(rating: number) {
  return rating >= 0.25 && rating <= 5 && Number.isInteger(rating * 4);
}
