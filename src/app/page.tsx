import { Suspense } from "react";
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
  return <p className="text-sm text-muted">Signed in as {email}</p>;
}
