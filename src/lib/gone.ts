export type GoneReason = "sold" | "donated" | "gave_away" | "lost" | "other";

export const GONE_LABEL: Record<GoneReason, string> = {
  sold: "Sold",
  donated: "Donated",
  gave_away: "Gave away",
  lost: "Lost",
  other: "Other",
};
