import "server-only";
import planJson from "../../../data/import/plan.json";
import reviewJson from "../../../data/import/review.json";

// The photo import built by scripts/import/build_plan.py.
export const IMPORT_BATCH = "photos-2026-10";

export type PlanCopy = {
  format: "print_unknown" | "ebook" | "audiobook";
  source: "shelf" | "kobo" | "audible" | "librofm";
  location?: string | null;
  edition?: string | null;
  edition_type?: "omnibus" | null;
  isbn13?: string | null;
  external_id?: string | null;
  narrators?: string[];
  evidence?: string;
};

export type PlanTitle = {
  key: string;
  title: string;
  authors: string[];
  series: string | null;
  series_no: number | null;
  book_type: "prose" | "graphic_novel" | "manga" | "comic_collection" | "picture_book" | "poetry";
  is_reference: boolean;
  needs_check: boolean;
  check_note: string | null;
  genre_guess: string | null;
  read_status: "read" | "unread";
  copies: PlanCopy[];
};

export type ReviewKind = "title_uncertain" | "match_uncertain" | "status_conflict" | "status_needed";

export type PlanReviewItem = {
  kind: ReviewKind;
  item_key: string;
  note: string;
  raw: Record<string, unknown>;
  suggested: Record<string, unknown>;
  title_key: string | null;
};

export const plan = planJson as PlanTitle[];
export const reviewItems = reviewJson as PlanReviewItem[];
export const planByKey = new Map(plan.map((t) => [t.key, t]));
