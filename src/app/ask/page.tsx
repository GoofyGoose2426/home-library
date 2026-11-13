import { Suspense } from "react";
import Link from "next/link";
import { AnswerView, PinAnswer } from "@/components/answer-view";
import { parseLookup, runLookup } from "@/lib/ask";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ask your library · Home Library" };

// An answer to a question she asked in a Claude session. The link carries
// the question and a read-only lookup; the app checks the lookup, works out
// the answer from her books, and offers to pin it to the Stats page.
export default function AskPage({ searchParams }: PageProps<"/ask">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
      <Link href="/stats" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Stats
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Ask your library</p>
      <Suspense fallback={<p className="mt-6 text-muted">Working it out…</p>}>
        <Answer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Answer({ searchParams }: Pick<PageProps<"/ask">, "searchParams">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const question = one(params.q).trim().slice(0, 1000);
  let raw: unknown = null;
  try {
    raw = JSON.parse(one(params.l));
  } catch {}
  const lookup = parseLookup(raw);
  if (!lookup) {
    return (
      <div className="mt-6 rounded-3xl border border-border bg-surface p-6">
        <p className="font-serif text-xl font-semibold">This link doesn&apos;t hold a lookup the app can run</p>
        <p className="mt-2 text-muted">It may have been cut short when it was copied. Ask for the link again in your Claude session.</p>
      </div>
    );
  }
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  const answer = runLookup(books, lookup);
  return (
    <>
      <h1 className="mt-1 font-serif text-3xl font-semibold">{question || "Your answer"}</h1>
      <section className="mt-6 rounded-3xl border border-border bg-surface p-4 sm:p-6">
        <AnswerView lookup={lookup} answer={answer} />
      </section>
      <section className="mt-6 rounded-3xl border border-border bg-surface p-4 sm:p-6">
        <PinAnswer question={question} lookup={lookup} suggestedName={question.replace(/\?$/, "").slice(0, 120) || "My answer"} />
      </section>
    </>
  );
}
