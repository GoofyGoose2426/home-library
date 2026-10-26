"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveClassification } from "@/app/edit-actions";
import {
  AUDIENCE,
  GRAPHIC_TYPES,
  KIND_LABEL,
  SPICE,
  STORY_FOCUS,
  VIBE,
  offered,
  prune,
  type Audience,
  type ListTag,
  type Spice,
  type StoryFocus,
  type TagKind,
  type Vibe,
} from "@/lib/classification";

export type ClassificationValues = {
  tagIds: string[];
  audience: Audience | null;
  romanticSubplot: boolean | null;
  spice: Spice | null;
  storyFocus: StoryFocus | null;
  vibeMain: Vibe | null;
  vibeSecond: Vibe | null;
};

// Values typed in here get a temporary id until saved.
const NEW = "new:";

export function ClassificationEditor({
  titleId,
  bookType,
  lists: savedLists,
  initial,
}: {
  titleId: string;
  bookType: string;
  lists: ListTag[];
  initial: ClassificationValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(savedLists);
  const [chosen, setChosen] = useState(() => new Set(initial.tagIds));
  const [v, setV] = useState(initial);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const byKind = useMemo(() => {
    const m = new Map<TagKind, ListTag[]>();
    for (const t of lists) m.set(t.kind, [...(m.get(t.kind) ?? []), t]);
    return m;
  }, [lists]);
  const kind = (k: TagKind) => byKind.get(k) ?? [];
  const named = (k: TagKind, name: string) => kind(k).find((t) => t.name.toLowerCase() === name.toLowerCase());

  const genres = kind("genre").filter((g) => chosen.has(g.id));
  const romance = named("genre", "Romance");
  const nonfiction = named("genre", "Nonfiction");
  const hasRomance = (!!romance && chosen.has(romance.id)) || v.romanticSubplot === true;
  const onlyNonfiction = genres.length > 0 && genres.every((g) => g.id === nonfiction?.id);
  const graphic = GRAPHIC_TYPES.includes(bookType);

  function toggle(id: string) {
    setChosen((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return prune(next, lists);
    });
  }

  function addNew(k: TagKind, name: string, parentIds: string[]) {
    const clean = name.trim();
    if (!clean) return;
    const existing = named(k, clean);
    if (existing) {
      if (!chosen.has(existing.id)) toggle(existing.id);
      return;
    }
    const id = `${NEW}${k}:${clean}`;
    setLists((l) => [...l, { id, kind: k, name: clean, parentIds }]);
    setChosen((c) => new Set(c).add(id));
  }

  function setStoryFocus(storyFocus: StoryFocus | null) {
    setV((x) => ({ ...x, storyFocus }));
    // Spice-led romance is Smut: tick it (she can untick it).
    const smut = named("subgenre", "Smut");
    if (storyFocus === "spice_led" && smut && romance && chosen.has(romance.id)) {
      setChosen((c) => new Set(c).add(smut.id));
    }
  }

  function save() {
    setMessage(null);
    const final = prune(chosen, lists);
    startBusy(async () => {
      const result = await saveClassification(titleId, {
        tagIds: [...final].filter((id) => !id.startsWith(NEW)),
        newTags: lists
          .filter((t) => t.id.startsWith(NEW) && final.has(t.id))
          .map((t) => ({ kind: t.kind, name: t.name, parentIds: t.parentIds.filter((p) => !p.startsWith(NEW)) })),
        audience: v.audience,
        romanticSubplot: v.romanticSubplot,
        spice: hasRomance ? v.spice : null,
        storyFocus: hasRomance ? v.storyFocus : null,
        vibeMain: v.vibeMain,
        vibeSecond: v.vibeMain ? v.vibeSecond : null,
      });
      if (!result.ok) return setMessage(result.error);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full border border-border bg-surface px-5 text-sm hover:bg-accent-soft"
      >
        Edit classification
      </button>
    );
  }

  // Subgenres sit under each chosen genre. One offered under most genres
  // (Retelling) shows once, under "Any genre".
  const subgenres = kind("subgenre");
  const wide = (t: ListTag) => t.parentIds.length > 3;
  const offeredIn = (k: TagKind) => kind(k).filter((t) => offered(t, chosen));
  const parentsFor = (k: TagKind) => [...new Set(kind(k).flatMap((t) => t.parentIds))];

  return (
    <div className="space-y-5 rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">Classification</p>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          Cancel
        </button>
      </div>

      <Group title="Audience">
        {AUDIENCE.map(([value, label]) => (
          <Chip key={value} on={v.audience === value} onClick={() => setV((x) => ({ ...x, audience: x.audience === value ? null : value }))}>
            {label}
          </Chip>
        ))}
      </Group>

      <Group title="Genre" note="Pick any." onAdd={(name) => addNew("genre", name, [])}>
        {kind("genre").map((t) => (
          <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
            {t.name}
          </Chip>
        ))}
      </Group>

      {genres.map((g) => {
        const subs = subgenres.filter((s) => s.parentIds.includes(g.id) && !wide(s));
        return (
          <Group
            key={g.id}
            title={g.id === nonfiction?.id ? "Nonfiction type" : `${g.name} subgenres`}
            onAdd={(name) => addNew("subgenre", name, [g.id])}
          >
            {subs.map((t) => (
              <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
                {t.name}
              </Chip>
            ))}
          </Group>
        );
      })}
      {subgenres.some((s) => wide(s) && offered(s, chosen)) && (
        <Group title="Any genre">
          {subgenres
            .filter((s) => wide(s) && offered(s, chosen))
            .map((t) => (
              <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
                {t.name}
              </Chip>
            ))}
        </Group>
      )}

      {(["supernatural_being", "shifter_type", "queer_romance_type", "retelling_type"] as TagKind[]).map(
        (k) =>
          offeredIn(k).length > 0 && (
            <Group
              key={k}
              title={KIND_LABEL[k]}
              nested
              onAdd={(name) => addNew(k, name, parentsFor(k))}
            >
              {offeredIn(k).map((t) => (
                <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
                  {t.name}
                </Chip>
              ))}
            </Group>
          ),
      )}

      {offeredIn("subject").length > 0 && (
        <Group title="Subjects" onAdd={(name) => addNew("subject", name, parentsFor("subject"))}>
          {offeredIn("subject").map((t) => (
            <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
              {t.name}
            </Chip>
          ))}
        </Group>
      )}

      {!onlyNonfiction && <Tropes tropes={kind("trope")} chosen={chosen} toggle={toggle} onAdd={(name) => addNew("trope", name, [])} />}

      <Group title="Romantic subplot">
        {([true, false] as const).map((b) => (
          <Chip
            key={String(b)}
            on={v.romanticSubplot === b}
            onClick={() => setV((x) => ({ ...x, romanticSubplot: x.romanticSubplot === b ? null : b }))}
          >
            {b ? "Yes" : "No"}
          </Chip>
        ))}
      </Group>

      {hasRomance ? (
        <>
          <fieldset>
            <legend className="text-sm font-medium">Spice</legend>
            <p className="text-xs text-muted">The Scoville Smut Scale</p>
            <ul className="mt-2 space-y-1.5">
              {SPICE.map(([value, label, description]) => (
                <li key={value}>
                  <button
                    type="button"
                    aria-pressed={v.spice === value}
                    onClick={() => setV((x) => ({ ...x, spice: x.spice === value ? null : value }))}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                      v.spice === value ? "border-accent bg-accent-soft" : "border-border bg-background"
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="block text-xs text-muted">{description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
          <Group title="Story focus">
            {STORY_FOCUS.map(([value, label]) => (
              <Chip key={value} on={v.storyFocus === value} onClick={() => setStoryFocus(v.storyFocus === value ? null : value)}>
                {label}
              </Chip>
            ))}
          </Group>
          {v.storyFocus === "spice_led" && <p className="-mt-3 text-xs text-muted">{STORY_FOCUS[2][2]}. Spice-led romance gets the Smut subgenre.</p>}
        </>
      ) : (
        <p className="text-xs text-muted">Spice and story focus appear for Romance, or when there&apos;s a romantic subplot.</p>
      )}

      <Group title="Vibe">
        {VIBE.map(([value, label]) => (
          <Chip
            key={value}
            on={v.vibeMain === value}
            onClick={() => setV((x) => ({ ...x, vibeMain: x.vibeMain === value ? null : value, vibeSecond: null }))}
          >
            {label}
          </Chip>
        ))}
      </Group>
      {v.vibeMain && (
        <Group title="Then (optional)" nested>
          {VIBE.filter(([value]) => value !== v.vibeMain).map(([value, label]) => (
            <Chip key={value} on={v.vibeSecond === value} onClick={() => setV((x) => ({ ...x, vibeSecond: x.vibeSecond === value ? null : value }))}>
              {label}
            </Chip>
          ))}
        </Group>
      )}

      <Group title="Reasons for reading" onAdd={(name) => addNew("reason", name, [])}>
        {kind("reason").map((t) => (
          <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
            {t.name}
          </Chip>
        ))}
      </Group>

      {graphic &&
        (["gn_style", "manga_demographic", "franchise"] as TagKind[]).map((k) => (
          <Group key={k} title={KIND_LABEL[k]} onAdd={(name) => addNew(k, name, [])}>
            {kind(k).map((t) => (
              <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
                {t.name}
              </Chip>
            ))}
          </Group>
        ))}

      {message && (
        <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}
      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-2xl bg-surface/95 py-2 backdrop-blur">
        <p className="text-xs text-muted">Saving marks everything here as set by you.</p>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="min-h-11 shrink-0 rounded-full bg-accent px-6 text-sm font-medium text-on-accent disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Tropes({
  tropes,
  chosen,
  toggle,
  onAdd,
}: {
  tropes: ListTag[];
  chosen: Set<string>;
  toggle: (id: string) => void;
  onAdd: (name: string) => void;
}) {
  const [find, setFind] = useState("");
  const shown = tropes.filter((t) => chosen.has(t.id) || t.name.toLowerCase().includes(find.trim().toLowerCase()));
  return (
    <Group title="Tropes" onAdd={onAdd}>
      <input
        value={find}
        onChange={(e) => setFind(e.target.value)}
        placeholder="Find a trope"
        aria-label="Find a trope"
        className="mb-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-base"
      />
      {shown.map((t) => (
        <Chip key={t.id} on={chosen.has(t.id)} onClick={() => toggle(t.id)}>
          {t.name}
        </Chip>
      ))}
    </Group>
  );
}

function Group({
  title,
  note,
  nested,
  onAdd,
  children,
}: {
  title: string;
  note?: string;
  nested?: boolean;
  onAdd?: (name: string) => void;
  children: React.ReactNode;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  return (
    <fieldset className={nested ? "border-l-2 border-accent-soft pl-3" : undefined}>
      <legend className="text-sm font-medium">
        {nested && <span className="text-muted">↳ </span>}
        {title}
      </legend>
      {note && <p className="text-xs text-muted">{note}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {children}
        {onAdd &&
          (adding === null ? (
            <button
              type="button"
              onClick={() => setAdding("")}
              className="min-h-9 rounded-full border border-dashed border-border px-3 text-xs text-muted hover:bg-accent-soft"
            >
              + Add
            </button>
          ) : (
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onAdd(adding);
                setAdding(null);
              }}
            >
              <input
                autoFocus
                value={adding}
                maxLength={80}
                onChange={(e) => setAdding(e.target.value)}
                placeholder={`New ${title.toLowerCase()} value`}
                aria-label={`Add to ${title}`}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-base"
              />
              <button type="submit" disabled={!adding.trim()} className="min-h-10 rounded-xl bg-accent px-3 text-sm text-on-accent disabled:opacity-40">
                Add
              </button>
              <button type="button" onClick={() => setAdding(null)} className="text-sm text-muted">
                Cancel
              </button>
            </form>
          ))}
      </div>
    </fieldset>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-xs ${
        on ? "border-accent bg-accent text-on-accent" : "border-border bg-background hover:bg-accent-soft"
      }`}
    >
      {children}
    </button>
  );
}
