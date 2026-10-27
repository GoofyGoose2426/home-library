"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { newShareLink, turnOffSharing } from "./actions";

export function SharingPanel({ link, since }: { link: string | null; since: string | null }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [confirm, setConfirm] = useState<"reset" | "off" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function act(action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) {
    setMessage(null);
    startBusy(async () => {
      const r = await action();
      setConfirm(null);
      if (!r.ok) return setMessage(r.error);
      setMessage(done);
      router.refresh();
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link copied. Paste it into a message to share it.");
    } catch {
      setMessage("Couldn't copy. Press and hold the link to copy it instead.");
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded-3xl border border-border bg-surface p-4">
      {link ? (
        <>
          <p className="text-sm">
            <strong>Sharing is on</strong>
            <span className="text-muted"> · this link since {since}</span>
          </p>
          <p className="break-all rounded-xl bg-background px-3 py-2 font-mono text-xs">{link}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-on-accent">
              Copy link
            </button>
            <a href={link} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-full border border-border px-4 text-sm">
              See what they see
            </a>
          </div>

          {confirm ? (
            <div className="rounded-2xl border border-accent p-3 text-sm">
              <p>
                {confirm === "reset"
                  ? "Make a new link? The current one stops working straight away; send the new one to the people you still want."
                  : "Turn off sharing? The link stops working straight away."}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    confirm === "reset"
                      ? act(newShareLink, "New link made. The old one no longer works.")
                      : act(turnOffSharing, "Sharing is off. The link no longer works.")
                  }
                  className="min-h-10 rounded-full bg-accent px-4 font-medium text-on-accent disabled:opacity-60"
                >
                  {busy ? "Working…" : confirm === "reset" ? "Yes, new link" : "Yes, turn off"}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="min-h-10 rounded-full border border-border px-4">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => setConfirm("reset")} className="min-h-10 rounded-full border border-border px-4 text-sm">
                Reset link
              </button>
              <button type="button" onClick={() => setConfirm("off")} className="min-h-10 rounded-full border border-border px-4 text-sm">
                Turn off sharing
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm">
            <strong>Sharing is off.</strong> <span className="text-muted">Nobody but you can see your library.</span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => act(newShareLink, "Sharing is on. Copy the link to send it.")}
            className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-on-accent disabled:opacity-60"
          >
            {busy ? "Turning on…" : "Turn on sharing"}
          </button>
        </>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
