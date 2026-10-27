import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { codeForLink, shareSecret } from "@/lib/supabase/shared";
import { createClient } from "@/lib/supabase/server";
import { SharingPanel } from "./sharing-panel";

export const metadata = { title: "Sharing · Home Library" };

export default function SharingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Library
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold">Sharing</h1>
      <p className="mt-2 text-muted">
        A secret link for friends and co-workers. Anyone with it can browse your library and book pages, but never
        change anything. They don&apos;t see loans, keepsake notes or your Gone list.
      </p>
      <Suspense fallback={<p className="mt-6 text-muted">Checking…</p>}>
        <Status />
      </Suspense>
    </main>
  );
}

async function Status() {
  if (!shareSecret()) {
    return (
      <p className="mt-6 rounded-2xl border border-accent px-4 py-3 text-sm">
        One setup step first: add <code>SHARE_LINK_SECRET</code> in Vercel (any long random string), then redeploy.
      </p>
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("share_links").select("id, created_at").is("turned_off_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return (
    <SharingPanel
      link={data ? `${origin}/s/${codeForLink(data.id)}` : null}
      since={data ? new Date(data.created_at).toLocaleDateString("en-CA", { dateStyle: "medium" }) : null}
    />
  );
}
