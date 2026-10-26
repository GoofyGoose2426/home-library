"use client";

/* eslint-disable @next/next/no-img-element -- hotlinked covers, see book-cover.tsx */
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { removeCopyCover, setCoverFromOpenLibrary, setCoverPhoto } from "@/app/edit-actions";
import { createClient } from "@/lib/supabase/browser";

const MAX_SIDE = 1200; // pixels; keeps photos small enough to load fast

// Shrinks a phone photo (and turns it the right way up) before uploading.
async function toJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.85),
  );
}

type Option = { coverId: number; label: string };

async function findCovers(query: string, author: string): Promise<Option[]> {
  const params = new URLSearchParams({ q: query, fields: "key,title,cover_i,first_publish_year", limit: "12" });
  if (author) params.set("author", author);
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error("Open Library didn't answer. Try again in a moment.");
  const docs: { key: string; title: string; cover_i?: number; first_publish_year?: number }[] = (await res.json()).docs ?? [];
  const options: Option[] = docs
    .filter((d) => d.cover_i)
    .map((d) => ({ coverId: d.cover_i!, label: `${d.title}${d.first_publish_year ? ` (${d.first_publish_year})` : ""}` }));

  // The best match's other editions often have the cover you're holding.
  if (docs[0]?.key) {
    const ed = await fetch(`https://openlibrary.org${docs[0].key}/editions.json?limit=40`);
    if (ed.ok) {
      const entries: { covers?: number[]; publishers?: string[]; publish_date?: string }[] = (await ed.json()).entries ?? [];
      for (const e of entries) {
        for (const id of e.covers ?? []) {
          if (id > 0) options.push({ coverId: id, label: [e.publishers?.[0], e.publish_date].filter(Boolean).join(", ") });
        }
      }
    }
  }
  const seen = new Set<number>();
  return options.filter((o) => !seen.has(o.coverId) && seen.add(o.coverId)).slice(0, 30);
}

export function CoverPicker({
  copyId,
  title,
  author,
  hasCover,
  isPhoto,
}: {
  copyId: string;
  title: string;
  author: string;
  hasCover: boolean;
  isPhoto: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState(title);
  const [options, setOptions] = useState<Option[] | null>(null);

  function finish(result: { ok: true } | { ok: false; error: string }) {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setOpen(false);
    setOptions(null);
    router.refresh();
  }

  function upload(file: File) {
    setMessage(null);
    startBusy(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("Please sign in again.");
        const path = `${data.user.id}/${copyId}/${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from("covers")
          .upload(path, await toJpeg(file), { contentType: "image/jpeg", upsert: false });
        if (error) throw new Error(error.message);
        finish(await setCoverPhoto(copyId, path));
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Couldn't upload that photo.");
      }
    });
  }

  function search() {
    setMessage(null);
    startBusy(async () => {
      try {
        const found = await findCovers(query, author);
        setOptions(found);
        if (!found.length) setMessage("No covers found. Try a shorter title, or take a photo instead.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Couldn't search Open Library.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 min-h-9 rounded-full border border-border px-4 text-sm hover:bg-accent-soft"
      >
        {hasCover ? "Change cover" : "Add a cover"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Cover for this copy</p>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted">
          Close
        </button>
      </div>
      {message && (
        <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
        className="min-h-11 w-full rounded-xl bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-60"
      >
        {busy ? "Working…" : "Take or choose a photo"}
      </button>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search Open Library covers"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-base"
        />
        <button type="submit" disabled={busy || !query.trim()} className="min-h-11 rounded-xl border border-border px-3 text-sm disabled:opacity-50">
          Find covers
        </button>
      </form>

      {options && options.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {options.map((o) => (
            <li key={o.coverId}>
              <button
                type="button"
                disabled={busy}
                onClick={() => startBusy(async () => finish(await setCoverFromOpenLibrary(copyId, o.coverId)))}
                className="block w-full text-left"
                aria-label={`Use this cover${o.label ? `: ${o.label}` : ""}`}
              >
                <img
                  src={`https://covers.openlibrary.org/b/id/${o.coverId}-M.jpg`}
                  alt=""
                  loading="lazy"
                  className="aspect-[2/3] w-full rounded-lg bg-accent-soft object-cover"
                />
                <span className="mt-1 line-clamp-2 block text-[10px] text-muted">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasCover && (
        <button
          type="button"
          disabled={busy}
          onClick={() => startBusy(async () => finish(await removeCopyCover(copyId)))}
          className="text-sm text-accent underline-offset-4 hover:underline"
        >
          {isPhoto ? "Remove my photo" : "Remove this cover"}
        </button>
      )}
    </div>
  );
}
