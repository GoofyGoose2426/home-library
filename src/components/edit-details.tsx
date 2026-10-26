"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveDetails, type DetailsInput } from "@/app/edit-actions";

type Role = DetailsInput["credits"][number]["role"];

const ROLES: [Role, string][] = [
  ["author", "Author"],
  ["writer", "Writer"],
  ["artist", "Artist"],
  ["editor", "Editor"],
  ["translator", "Translator"],
];

const BOOK_TYPES: [DetailsInput["bookType"], string][] = [
  ["prose", "Prose"],
  ["graphic_novel", "Graphic novel"],
  ["manga", "Manga"],
  ["comic_collection", "Comic collection"],
  ["picture_book", "Picture book"],
  ["poetry", "Poetry"],
];

export type DetailsBook = {
  id: string;
  title: string;
  subtitle: string | null;
  bookType: string;
  series: string | null;
  seriesNumber: number | null;
  needsCheck: boolean;
  credits: { name: string; role: string }[];
  audiobooks: { id: string; label: string; narrators: string[] }[];
};

const input = "mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2 text-base";

export function EditDetails({
  book,
  seriesNames,
  peopleNames,
}: {
  book: DetailsBook;
  seriesNames: string[];
  peopleNames: string[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full border border-border bg-surface px-5 text-sm hover:bg-accent-soft"
      >
        Edit details
      </button>
    );
  }
  return <DetailsForm book={book} seriesNames={seriesNames} peopleNames={peopleNames} onClose={() => setOpen(false)} />;
}

function DetailsForm({
  book,
  seriesNames,
  peopleNames,
  onClose,
}: {
  book: DetailsBook;
  seriesNames: string[];
  peopleNames: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const ids = useId();
  const [title, setTitle] = useState(book.title);
  const [subtitle, setSubtitle] = useState(book.subtitle ?? "");
  const [bookType, setBookType] = useState(book.bookType as DetailsInput["bookType"]);
  const [series, setSeries] = useState(book.series ?? "");
  const [seriesNumber, setSeriesNumber] = useState(book.seriesNumber != null ? String(Number(book.seriesNumber)) : "");
  const [credits, setCredits] = useState(
    book.credits.length ? book.credits.map((c) => ({ ...c, role: c.role as Role })) : [{ name: "", role: "author" as Role }],
  );
  const [narrators, setNarrators] = useState(
    Object.fromEntries(book.audiobooks.map((a) => [a.id, a.narrators.join(", ")])),
  );
  const [clearCheck, setClearCheck] = useState(book.needsCheck);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const setCredit = (i: number, patch: Partial<{ name: string; role: Role }>) =>
    setCredits((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, by: number) =>
    setCredits((cs) => {
      const next = [...cs];
      const [c] = next.splice(i, 1);
      next.splice(i + by, 0, c);
      return next;
    });

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const number = seriesNumber.trim() === "" ? null : Number(seriesNumber.replace(",", "."));
    if (number !== null && (!Number.isFinite(number) || number < 0)) {
      setError("The series number should be a number, like 3 or 1.5.");
      return;
    }
    startSaving(async () => {
      const result = await saveDetails(book.id, {
        title,
        subtitle,
        bookType,
        series,
        seriesNumber: number,
        credits: credits.filter((c) => c.name.trim()),
        narrators: book.audiobooks.map((a) => ({
          copyId: a.id,
          names: (narrators[a.id] ?? "").split(",").map((n) => n.trim()).filter(Boolean),
        })),
        clearCheck,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <p className="font-serif text-xl font-semibold">Edit details</p>
      {error && (
        <p role="alert" className="rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          {error}
        </p>
      )}

      <label className="block text-sm">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} className={input} />
      </label>
      <label className="block text-sm">
        Subtitle <span className="text-muted">(optional)</span>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={300} className={input} />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm">People</legend>
        <datalist id={`${ids}-people`}>
          {peopleNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {credits.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              value={c.name}
              onChange={(e) => setCredit(i, { name: e.target.value })}
              list={`${ids}-people`}
              placeholder="Name"
              aria-label={`Person ${i + 1}`}
              maxLength={200}
              className="min-w-0 flex-1 basis-40 rounded-xl border border-border bg-background px-3 py-2 text-base"
            />
            <select
              value={c.role}
              onChange={(e) => setCredit(i, { role: e.target.value as Role })}
              aria-label={`Role of person ${i + 1}`}
              className="rounded-xl border border-border bg-background px-2 py-2 text-base"
            >
              {ROLES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <SmallButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </SmallButton>
              <SmallButton label="Move down" disabled={i === credits.length - 1} onClick={() => move(i, 1)}>
                ↓
              </SmallButton>
              <SmallButton label="Remove" onClick={() => setCredits((cs) => cs.filter((_, j) => j !== i))}>
                ✕
              </SmallButton>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCredits((cs) => [...cs, { name: "", role: "author" }])}
          className="text-sm text-accent underline-offset-4 hover:underline"
        >
          + Add a person
        </button>
      </fieldset>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className="block text-sm">
          Series <span className="text-muted">(blank if none)</span>
          <input value={series} onChange={(e) => setSeries(e.target.value)} list={`${ids}-series`} maxLength={200} className={input} />
          <datalist id={`${ids}-series`}>
            {seriesNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm">
          Number
          <input
            value={seriesNumber}
            onChange={(e) => setSeriesNumber(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 2"
            disabled={!series.trim()}
            className={`${input} disabled:opacity-50`}
          />
        </label>
      </div>

      <label className="block text-sm">
        Book type
        <select value={bookType} onChange={(e) => setBookType(e.target.value as DetailsInput["bookType"])} className={input}>
          {BOOK_TYPES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {book.audiobooks.map((a) => (
        <label key={a.id} className="block text-sm">
          Narrators · {a.label} <span className="text-muted">(separate with commas)</span>
          <input
            value={narrators[a.id] ?? ""}
            onChange={(e) => setNarrators((n) => ({ ...n, [a.id]: e.target.value }))}
            maxLength={1000}
            className={input}
          />
        </label>
      ))}

      {book.needsCheck && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={clearCheck}
            onChange={(e) => setClearCheck(e.target.checked)}
            className="mt-0.5 size-5 accent-[var(--accent)]"
          />
          <span>
            These details are right now
            <span className="block text-xs text-muted">Removes the &ldquo;Needs checking&rdquo; flag.</span>
          </span>
        </label>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-xl bg-accent px-5 text-sm font-medium text-on-accent disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save details"}
        </button>
        <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl px-4 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function SmallButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="size-10 rounded-xl border border-border bg-background text-sm disabled:opacity-30"
    >
      {children}
    </button>
  );
}
