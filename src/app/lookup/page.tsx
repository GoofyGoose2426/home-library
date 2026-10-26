import { Suspense } from "react";
import Link from "next/link";
import { loadLibrary } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";
import { Lookup } from "./lookup";

export const metadata = { title: "Do I own it? · Home Library" };

export default function LookupPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Do I own it?</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Opening your library…</p>}>
        <LookupData />
      </Suspense>
    </main>
  );
}

async function LookupData() {
  const supabase = await createClient();
  const books = await loadLibrary(supabase);
  return <Lookup books={books} />;
}
