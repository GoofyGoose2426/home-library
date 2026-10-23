// What Alexandra can decide for each review item, stored in
// import_items.decision + decided_value.

export type Decision =
  | { decision: "accepted"; value: { read_status: "read" | "unread" } } // status items
  | { decision: "edited"; value: { title: string; authors: string[] } } // fixed title/author
  | { decision: "accepted"; value: { keep_flagged: true } } // keep, still unsure
  | { decision: "skipped"; value: { skip: true } } // don't import this book
  | { decision: "accepted"; value: { merge: boolean } }; // duplicate: merge or keep both

export type DecidedValue = Decision["value"];
