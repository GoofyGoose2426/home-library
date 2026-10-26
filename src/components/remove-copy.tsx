"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCopy, markCopyGone, undoCopyGone } from "@/app/edit-actions";
import { GONE_LABEL, type GoneReason } from "@/lib/gone";

// "Remove this copy" on the book page: either she no longer owns it (it moves
// to the Gone list and can be brought back) or it was added by mistake (it's
// deleted, after she confirms).
export function RemoveCopy({ copyId, label, isLastCopy }: { copyId: string; label: string; isLastCopy: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "choose" | "confirm">("closed");
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function gone(reason: GoneReason) {
    setMessage(null);
    startBusy(async () => {
      const result = await markCopyGone(copyId, reason);
      if (!result.ok) return setMessage(result.error);
      setStep("closed");
      router.refresh();
    });
  }

  function remove() {
    setMessage(null);
    startBusy(async () => {
      const result = await deleteCopy(copyId);
      if (!result.ok) return setMessage(result.error);
      if (result.titleDeleted) router.replace("/");
      else {
        setStep("closed");
        router.refresh();
      }
    });
  }

  if (step === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStep("choose")}
        className="mt-3 ml-2 min-h-9 rounded-full border border-border px-4 text-sm text-muted hover:bg-accent-soft"
      >
        Remove this copy
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Remove the {label}</p>
        <button type="button" onClick={() => setStep("closed")} className="text-sm text-muted">
          Cancel
        </button>
      </div>
      {message && (
        <p role="alert" className="rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {message}
        </p>
      )}

      {step === "choose" ? (
        <>
          <div>
            <p className="text-sm">I no longer own it:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(GONE_LABEL) as GoneReason[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={busy}
                  onClick={() => gone(r)}
                  className="min-h-10 rounded-full border border-border px-4 text-sm hover:bg-accent-soft disabled:opacity-50"
                >
                  {GONE_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              It moves to your Gone list, where you can undo it.
              {isLastCopy && " It's your only copy, so the book leaves your library and stats until you undo."}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("confirm")}
              className="min-h-10 rounded-full border border-border px-4 text-sm hover:bg-accent-soft disabled:opacity-50"
            >
              It was added by mistake
            </button>
            <p className="mt-2 text-xs text-muted">For a copy you never had. It&apos;s deleted for good.</p>
          </div>
        </>
      ) : (
        <div>
          <p className="text-sm">
            Delete the {label} for good?
            {isLastCopy && " It's the only copy, so the whole book and its details are deleted too."} This can&apos;t be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Yes, delete it"}
            </button>
            <button type="button" disabled={busy} onClick={() => setStep("choose")} className="min-h-10 rounded-full border border-border px-4 text-sm">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UndoGone({ copyId }: { copyId: string }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          startBusy(async () => {
            const result = await undoCopyGone(copyId);
            if (!result.ok) setMessage(result.error);
            else router.refresh();
          })
        }
        className="min-h-9 shrink-0 rounded-full border border-border px-4 text-sm hover:bg-accent-soft disabled:opacity-50"
      >
        {busy ? "Undoing…" : "Undo"}
      </button>
      {message && (
        <span role="alert" className="mt-1 text-xs text-accent">
          {message}
        </span>
      )}
    </span>
  );
}
