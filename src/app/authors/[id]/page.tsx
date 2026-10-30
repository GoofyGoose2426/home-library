import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuthorDetail } from "@/components/author-detail";
import { BackLink } from "@/components/back-link";
import { loadAuthor } from "@/lib/author";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Author · Home Library" };

export default function AuthorPage({ params }: PageProps<"/authors/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
      <BackLink />
      <Suspense fallback={<p className="mt-8 text-muted">Opening the author…</p>}>
        <AuthorData params={params} />
      </Suspense>
    </main>
  );
}

async function AuthorData({ params }: Pick<PageProps<"/authors/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const author = await loadAuthor(supabase, id);
  if (!author) notFound();
  return <AuthorDetail author={author} />;
}
