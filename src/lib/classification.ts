// Alexandra's classification fields (docs/starter-lists.md, build-plan.md).
// Her wording: "Fantasy romance" (never "romantasy"), Smut is a Romance
// subgenre, Scoville Smut Scale labels. Shared by the server and the browser.

export type TagKind =
  | "genre"
  | "subgenre"
  | "supernatural_being"
  | "shifter_type"
  | "queer_romance_type"
  | "retelling_type"
  | "trope"
  | "subject"
  | "reason"
  | "gn_style"
  | "manga_demographic"
  | "franchise"
  | "rough_genre";

// A list value; parents say when it's offered (see tag_parents).
export type ListTag = { id: string; kind: TagKind; name: string; parentIds: string[] };

export const KIND_LABEL: Record<TagKind, string> = {
  genre: "Genre",
  subgenre: "Subgenre",
  supernatural_being: "Supernatural beings",
  shifter_type: "Shifter type",
  queer_romance_type: "Queer romance type",
  retelling_type: "Retelling type",
  trope: "Tropes",
  subject: "Subjects",
  reason: "Reasons for reading",
  gn_style: "Origin / style",
  manga_demographic: "Manga demographic",
  franchise: "Universe / franchise",
  rough_genre: "Rough genre (from your shelf photos)",
};

export type Audience = "adult" | "young_adult" | "middle_grade" | "childrens";
export const AUDIENCE: [Audience, string][] = [
  ["adult", "Adult"],
  ["young_adult", "Young adult"],
  ["middle_grade", "Middle grade"],
  ["childrens", "Children's"],
];

export type Vibe = "cozy" | "light" | "dramatic" | "intense";
export const VIBE: [Vibe, string][] = [
  ["cozy", "Cozy/feel-good"],
  ["light", "Light/fun"],
  ["dramatic", "Dramatic/heavy"],
  ["intense", "Intense/dark"],
];

export type Spice =
  | "green_pepper"
  | "yellow_pepper"
  | "orange_pepper"
  | "red_pepper_1"
  | "red_pepper_2"
  | "red_pepper_3"
  | "red_pepper_4"
  | "red_pepper_5";
// The Scoville Smut Scale (adapted from Carrie Ward, @authorcarrieward).
export const SPICE: [Spice, string, string][] = [
  ["green_pepper", "Green pepper", "They fall in love; the door stays firmly shut"],
  ["yellow_pepper", "Yellow pepper", "Making out and some heavy petting; sex is implied, not shown"],
  ["orange_pepper", "Orange pepper", "It happens on page, but in vague euphemisms"],
  ["red_pepper_1", "1 red pepper", "On-page sex, still discreet language"],
  ["red_pepper_2", "2 red peppers", "Fully on page, but the language stays fairly polite"],
  ["red_pepper_3", "3 red peppers", "Explicit and frequent across several chapters, nothing unfamiliar"],
  ["red_pepper_4", "4 red peppers", "Kink, BDSM and group scenes are in play"],
  ["red_pepper_5", "5 red peppers", "The most explicit end of the scale"],
];

export type StoryFocus = "plot_led" | "balanced" | "spice_led";
export const STORY_FOCUS: [StoryFocus, string, string][] = [
  ["plot_led", "Plot-led", ""],
  ["balanced", "Balanced", ""],
  ["spice_led", "Spice-led", "Sex scenes are most of the story; the plot mainly connects them"],
];

export const labelOf = <K extends string>(list: [K, string, ...string[]][], value: K | null | undefined) =>
  value ? (list.find((x) => x[0] === value)?.[1] ?? value) : null;

export const GRAPHIC_TYPES = ["graphic_novel", "manga", "comic_collection"];

// The library's filter groups for classification, in panel order. Each book
// carries its values per group as labels (see LibraryBook.facets).
export const FACETS: { key: string; title: string; note?: string }[] = [
  { key: "genre", title: "Genre" },
  { key: "subgenre", title: "Subgenre" },
  { key: "supernatural_being", title: "Supernatural beings" },
  { key: "shifter_type", title: "Shifter type" },
  { key: "queer_romance_type", title: "Queer romance type" },
  { key: "retelling_type", title: "Retelling type" },
  { key: "trope", title: "Tropes" },
  { key: "audience", title: "Audience" },
  { key: "vibe", title: "Vibe" },
  { key: "romantic_subplot", title: "Romantic subplot" },
  { key: "spice", title: "Spice" },
  { key: "story_focus", title: "Story focus" },
  { key: "subject", title: "Nonfiction subject" },
  { key: "reason", title: "Reasons for reading" },
  { key: "gn_style", title: "Graphic novel origin / style" },
  { key: "manga_demographic", title: "Manga demographic" },
  { key: "franchise", title: "Universe / franchise" },
  { key: "rough_genre", title: "Rough genre", note: "From the shelf photos; goes away once you set a book's genres." },
];

// Which values in a list are offered, given what's chosen: no parents means
// always; otherwise at least one parent must be chosen.
export function offered(tag: ListTag, chosen: Set<string>) {
  return tag.parentIds.length === 0 || tag.parentIds.some((p) => chosen.has(p));
}

// Drops chosen values whose parents are no longer chosen (three levels deep).
export function prune(chosen: Set<string>, lists: ListTag[]) {
  const byId = new Map(lists.map((t) => [t.id, t]));
  let next = new Set(chosen);
  for (let i = 0; i < 4; i++) {
    const kept = new Set([...next].filter((id) => !byId.get(id) || offered(byId.get(id)!, next)));
    if (kept.size === next.size) break;
    next = kept;
  }
  return next;
}
