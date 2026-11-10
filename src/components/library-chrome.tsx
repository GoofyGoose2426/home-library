"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import type { LibraryBook } from "@/lib/library";
import type { Filters } from "@/lib/library-filters";

// The library's menus: pinned to the top and bottom on a phone, and down the
// left side on a wider screen, so they're always in reach while scrolling.

// ---------------------------------------------------------------------------
// Status tags on each book: Read (green), TBR or Partly read (pink), On loan (purple).

export function StatusTags({ book, showLoan }: { book: LibraryBook; showLoan: boolean }) {
  const loan = showLoan && book.onLoanTo.length > 0;
  return (
    <span className="flex flex-wrap gap-1">
      {book.readStatus === "read" ? (
        <span className="rounded-full bg-tag-read px-1.5 py-px text-[10px] font-semibold text-on-tag-read">✓ Read</span>
      ) : (
        <span className="rounded-full bg-tag-tbr px-1.5 py-px text-[10px] font-semibold text-on-tag-tbr">
          {book.readStatus === "partly_read" ? "Partly read" : "TBR"}
        </span>
      )}
      {loan && (
        <span
          className="rounded-full bg-tag-loan px-1.5 py-px text-[10px] font-semibold text-on-tag-loan"
          title={`On loan to ${book.onLoanTo.join(", ")}`}
        >
          On loan
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// All / Read / TBR, On loan, and the needs-review flag.

type Show = "all" | "read" | "tbr";
const TBR: LibraryBook["readStatus"][] = ["unread", "partly_read"];

function showing(f: Filters): Show | null {
  const s = [...f.status].sort();
  if (!s.length) return "all";
  if (s.length === 1 && s[0] === "read") return "read";
  if (s.length === 2 && s[0] === "partly_read" && s[1] === "unread") return "tbr";
  return null; // some other mix, chosen in Filters
}

export function QuickFilters({
  books,
  filters,
  onChange,
  owner,
  toReview,
}: {
  books: LibraryBook[];
  filters: Filters;
  onChange: (change: (current: Filters) => Filters) => void;
  owner: boolean;
  toReview: number;
}) {
  const current = showing(filters);
  const read = books.filter((b) => b.readStatus === "read").length;
  const onLoan = books.filter((b) => b.onLoanTo.length > 0).length;
  const loanOn = filters.flag.includes("loan");
  const reviewOn = filters.review.includes("any");
  const choices: [Show, string, number][] = [
    ["all", "All", books.length],
    ["read", "Read", read],
    ["tbr", "TBR", books.length - read],
  ];

  return (
    <div className="flex items-center gap-1.5 lg:flex-col lg:items-stretch lg:gap-2">
      <div className="flex rounded-full border border-border bg-surface p-0.5" role="group" aria-label="Show">
        {choices.map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            aria-pressed={current === key}
            onClick={() => onChange((f) => ({ ...f, status: key === "all" ? [] : key === "read" ? ["read"] : TBR }))}
            className={`min-h-8 flex-1 whitespace-nowrap rounded-full px-2 text-xs font-medium ${current === key ? "bg-accent text-on-accent" : ""}`}
          >
            {label} <span className="font-normal opacity-80">{n.toLocaleString()}</span>
          </button>
        ))}
      </div>
      {owner && (
        <button
          type="button"
          aria-pressed={loanOn}
          onClick={() => onChange((f) => ({ ...f, flag: loanOn ? f.flag.filter((x) => x !== "loan") : [...f.flag, "loan"] }))}
          className={`min-h-8 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${loanOn ? "bg-on-tag-loan text-tag-loan" : "bg-tag-loan text-on-tag-loan"}`}
        >
          On loan {onLoan}
        </button>
      )}
      {owner && toReview > 0 && (
        <button
          type="button"
          aria-pressed={reviewOn}
          onClick={() =>
            onChange((f) => ({ ...f, review: reviewOn ? f.review.filter((r) => r !== "any") : [...f.review, "any"] }))
          }
          aria-label={`${toReview.toLocaleString()} need review`}
          className={`min-h-8 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${reviewOn ? "bg-accent text-on-accent" : "bg-accent-soft"}`}
        >
          ⚑ {toReview.toLocaleString()}<span className="hidden lg:inline"> need review</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The owner's links: the main two up top, the tools below or in More.

export function OwnerNav() {
  return (
    <nav className="flex items-center gap-1.5 text-xs lg:flex-col lg:items-stretch lg:gap-2 lg:text-sm" aria-label="Main">
      <Link href="/lookup" className="rounded-full bg-accent px-3 py-1.5 text-center font-medium text-on-accent lg:py-2">
        Do I own it?
      </Link>
      <Link href="/add" className="rounded-full border border-accent px-3 py-1.5 text-center font-medium text-accent lg:py-2">
        + Add
      </Link>
    </nav>
  );
}

const TOOLS: [string, string][] = [
  ["/check", "To check"],
  ["/gone", "Gone list"],
  ["/fill", "Fill in details"],
  ["/duplicates", "Possible duplicates"],
  ["/series-check", "Series check"],
  ["/formats", "Print formats"],
  ["/sharing", "Sharing"],
];

function Downloads() {
  return (
    <div className="text-xs text-muted">
      <p className="font-medium text-foreground">Download my library</p>
      <p className="mt-1">
        <a href="/backup" className="text-accent underline-offset-4 hover:underline">
          Spreadsheet (CSV)
        </a>{" "}
        ·{" "}
        <a href="/backup?format=json" className="text-accent underline-offset-4 hover:underline">
          Full backup (JSON)
        </a>
      </p>
      <p className="mt-1">Keep a copy somewhere safe now and then. The free database plan has no automatic backups.</p>
    </div>
  );
}

function SignOut() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-muted underline-offset-4 hover:underline">
        Sign out
      </button>
    </form>
  );
}

// Down the left side on a wide screen.
export function SideTools() {
  return (
    <div className="mt-6 space-y-5 border-t border-border pt-4">
      <nav aria-label="Tools" className="flex flex-col gap-1 text-sm">
        {TOOLS.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-2 py-1 hover:bg-accent-soft">
            {label}
          </Link>
        ))}
      </nav>
      <Downloads />
      <SignOut />
    </div>
  );
}

// Pinned to the bottom on a phone: the two most used, and More for the rest.
export function BottomTools() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 space-y-5 rounded-t-3xl bg-surface p-5 pb-8 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="font-serif text-lg font-semibold">More</p>
              <button type="button" onClick={() => setOpen(false)} className="min-h-9 rounded-full border border-border px-4 text-sm">
                Close
              </button>
            </div>
            <nav aria-label="Tools" className="grid grid-cols-2 gap-2 text-sm">
              {TOOLS.slice(2).map(([href, label]) => (
                <Link key={href} href={href} className="rounded-xl border border-border px-3 py-2.5">
                  {label}
                </Link>
              ))}
            </nav>
            <Downloads />
            <SignOut />
          </div>
        </div>
      )}
      <nav
        aria-label="Tools"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] text-xs backdrop-blur lg:hidden"
      >
        {TOOLS.slice(0, 2).map(([href, label]) => (
          <Link key={href} href={href} className="flex min-h-12 flex-1 items-center justify-center font-medium">
            {label}
          </Link>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 flex-1 items-center justify-center font-medium">
          More ▴
        </button>
      </nav>
    </>
  );
}
