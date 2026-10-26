import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        📚
      </p>
      <h1 className="font-serif text-3xl font-semibold">Home Library</h1>
      <p className="max-w-sm text-muted">
        Your shelves are on their way. The library opens once your books are
        imported.
      </p>
      <Suspense fallback={null}>
        <SignedInAs />
      </Suspense>
    </main>
  );
}

async function SignedInAs() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (typeof email !== "string") return null;
  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <Link
        href="/covers"
        className="rounded-2xl bg-accent px-5 py-3 font-medium text-on-accent"
      >
        Check covers
      </Link>
      <p className="text-sm text-muted">Signed in as {email}</p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-2xl border border-border px-4 py-2 text-sm hover:bg-accent-soft"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
