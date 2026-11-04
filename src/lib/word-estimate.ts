// Rough words per page by format; labelled as an estimate wherever shown.
const WORDS_PER_PAGE: Record<string, number> = { mass_market: 300 };
const DEFAULT_WORDS_PER_PAGE = 275;

// Estimated words for a copy, to the nearest thousand.
export function estimateWords(pages: number, format: string) {
  return Math.round((pages * (WORDS_PER_PAGE[format] ?? DEFAULT_WORDS_PER_PAGE)) / 1000) * 1000;
}
