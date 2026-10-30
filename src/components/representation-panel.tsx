"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAuthorIdentity, addCharacterRep, reviewIdentity, setOwnVoices } from "@/app/authors/actions";
import { CATEGORIES, hostOf, type IdentityCategory, type IdentityValue } from "@/lib/representation";

// Every category with its values (or "Unknown"), each value with where it
// came from: a link and the words that say it. Alexandra can confirm or
// remove a suggestion, and add her own.
export function RepresentationPanel({
  kind,
  targetId,
  values,
  readOnly = false,
}: {
  kind: "author" | "character";
  targetId: string;
  values: IdentityValue[];
  readOnly?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  // Characters list only what's recorded; authors show every category, so
  // "unknown" is visible.
  const shown = kind === "author" ? CATEGORIES : CATEGORIES.filter((c) => values.some((v) => v.category === c.key));
  return (
    <div>
      {!shown.length && <p className="text-sm text-muted">Nothing recorded yet.</p>}
      <dl className={shown.length ? "divide-y divide-border rounded-2xl border border-border bg-surface" : "hidden"}>
        {shown.map((c) => {
          const own = values.filter((v) => v.category === c.key);
          return (
            <div key={c.key} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[11rem_1fr] sm:gap-3">
              <dt className="text-muted">{c.label}</dt>
              <dd className="min-w-0">
                {own.length ? (
                  <ul className="space-y-2">
                    {own.map((v) => (
                      <li key={v.id}>
                        <Value value={v} kind={kind} readOnly={readOnly} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted">Unknown</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {!readOnly &&
        (adding ? (
          <AddForm kind={kind} targetId={targetId} onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 min-h-10 rounded-full border border-border px-4 text-sm hover:bg-accent-soft"
          >
            + Add a value
          </button>
        ))}
    </div>
  );
}

function sourceText(v: IdentityValue) {
  if (v.source === "alexandra") return "Set by you";
  const who = v.source === "claude" ? "Found by Claude" : (hostOf(v.source) ?? v.source);
  return v.confirmed ? `${who} · confirmed` : `${who} · not confirmed yet`;
}

function Value({ value: v, kind, readOnly }: { value: IdentityValue; kind: "author" | "character"; readOnly: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  function act(action: "confirm" | "reject") {
    setMessage(null);
    start(async () => {
      const r = await reviewIdentity(action, kind, v.id);
      if (!r.ok) return setMessage(r.error);
      router.refresh();
    });
  }

  return (
    <div>
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 ${v.confirmed || readOnly ? "bg-accent-soft" : "border border-dashed border-border"}`}
      >
        {v.value}
      </span>
      {v.characterName && <span className="text-muted"> · {v.characterName}</span>}
      {v.quote && <q className="mt-1 block text-[13px] italic leading-snug">{v.quote}</q>}
      <span className="mt-0.5 block text-[11px] text-muted">
        {!readOnly && <>{sourceText(v)}</>}
        {v.sourceUrl && (
          <>
            {!readOnly && " · "}
            <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
              {hostOf(v.sourceUrl) ?? "Source"}
            </a>
          </>
        )}
      </span>
      {!readOnly && (
        <span className="mt-1 flex flex-wrap items-center gap-2">
          {!v.confirmed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act("confirm")}
              className="min-h-8 rounded-full bg-accent px-3 text-xs font-medium text-on-accent disabled:opacity-60"
            >
              ✓ Confirm
            </button>
          )}
          {asking ? (
            <>
              <span className="text-xs">Remove {v.value}?</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => act("reject")}
                className="min-h-8 rounded-full bg-accent px-3 text-xs font-medium text-on-accent disabled:opacity-60"
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setAsking(false)} className="min-h-8 rounded-full border border-border px-3 text-xs">
                No
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAsking(true)}
              className="min-h-8 rounded-full border border-border px-3 text-xs text-muted"
            >
              {v.confirmed ? "Remove" : "✕ Reject"}
            </button>
          )}
        </span>
      )}
      {message && (
        <p role="alert" className="mt-1 text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}

const OTHER = "__other";

function AddForm({ kind, targetId, onDone }: { kind: "author" | "character"; targetId: string; onDone: () => void }) {
  const router = useRouter();
  const [category, setCategory] = useState<IdentityCategory>("gender_identity");
  const [pick, setPick] = useState("");
  const [typed, setTyped] = useState("");
  const [character, setCharacter] = useState("");
  const [url, setUrl] = useState("");
  const [quote, setQuote] = useState("");
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const cat = CATEGORIES.find((c) => c.key === category)!;
  const value = cat.picks && pick !== OTHER ? pick : typed;
  const field = "mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-base";

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          const r =
            kind === "author"
              ? await addAuthorIdentity(targetId, category, value, url || null, quote || null)
              : await addCharacterRep(targetId, category, value, character || null, url || null, quote || null);
          if (!r.ok) return setMessage(r.error);
          router.refresh();
          onDone();
        });
      }}
    >
      <label className="block">
        <span className="font-medium">Category</span>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as IdentityCategory);
            setPick("");
            setTyped("");
          }}
          className={field}
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      {cat.picks && (
        <label className="block">
          <span className="font-medium">Value</span>
          <select value={pick} onChange={(e) => setPick(e.target.value)} required className={field}>
            <option value="" disabled>
              Pick one
            </option>
            {cat.picks.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={OTHER}>Other (type it)</option>
          </select>
        </label>
      )}
      {(!cat.picks || pick === OTHER) && (
        <label className="block">
          <span className="font-medium">{cat.picks ? "Their word" : "Value"}</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} required maxLength={120} placeholder={cat.hint} className={field} />
        </label>
      )}
      {kind === "character" && (
        <label className="block">
          <span className="font-medium">Character</span> <span className="text-muted">(optional)</span>
          <input value={character} onChange={(e) => setCharacter(e.target.value)} maxLength={120} className={field} />
        </label>
      )}
      <label className="block">
        <span className="font-medium">Link</span> <span className="text-muted">(optional)</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" placeholder="https://" className={field} />
      </label>
      <label className="block">
        <span className="font-medium">Their words</span> <span className="text-muted">(optional)</span>
        <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={2} maxLength={600} className={field} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !value.trim()} className="min-h-10 rounded-full bg-accent px-4 font-medium text-on-accent disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="min-h-10 rounded-full border border-border px-4">
          Cancel
        </button>
      </div>
      {message && (
        <p role="alert" className="text-xs text-accent">
          {message}
        </p>
      )}
    </form>
  );
}

// Own voices: the author shares the main character's identity. Suggested
// when both sides have a source; Alexandra decides.
export function OwnVoices({
  titleId,
  value,
  source,
  readOnly = false,
}: {
  titleId: string;
  value: boolean | null;
  source: { source: string; confirmed: boolean } | undefined;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const label = value == null ? "Not set" : value ? "Yes" : "No";
  if (readOnly) return value == null ? null : <p className="text-sm">Own voices: {label}</p>;

  function set(v: boolean | null) {
    setMessage(null);
    start(async () => {
      const r = await setOwnVoices(titleId, v);
      if (!r.ok) return setMessage(r.error);
      router.refresh();
    });
  }
  const note =
    !source || value == null
      ? null
      : source.source === "alexandra"
        ? "Set by you"
        : `Suggested by Claude · ${source.confirmed ? "confirmed" : "not confirmed yet"}`;
  const choice = (v: boolean | null, text: string) => (
    <button
      type="button"
      disabled={busy}
      aria-pressed={value === v && (v !== null || source?.source === "alexandra")}
      onClick={() => set(v)}
      className={`min-h-9 rounded-full px-4 text-sm disabled:opacity-60 ${
        value === v ? "bg-accent text-on-accent" : "border border-border"
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className="text-sm">
      <p>
        <span className="text-muted">Own voices:</span> {label}
        {note && <span className="block text-[11px] text-muted">{note}</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {choice(true, "Yes")}
        {choice(false, "No")}
        {value != null && choice(null, "Clear")}
      </div>
      {message && (
        <p role="alert" className="mt-1 text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}
