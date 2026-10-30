import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuthorDetail } from "@/components/author-detail";
import { BackLink } from "@/components/back-link";
import { loadAuthor } from "@/lib/author";
import { sharedClient } from "@/lib/supabase/shared";
import { LinkOff, SharedFrame } from "../../shared";

export default function SharedAuthorPage({ params }: PageProps<"/s/[code]/authors/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
      <Suspense fallback={<p className="mt-8 text-muted">Opening the author…</p>}>
        <SharedAuthor params={params} />
      </Suspense>
    </main>
  );
}

async function SharedAuthor({ params }: Pick<PageProps<"/s/[code]/authors/[id]">, "params">) {
  const { code, id } = await params;
  const supabase = await sharedClient(code);
  if (!supabase) return <LinkOff />;
  const author = await loadAuthor(supabase, id, { shared: true });
  if (!author) notFound();
  return (
    <SharedFrame code={code}>
      <BackLink />
      <AuthorDetail author={author} readOnly base={`/s/${code}`} />
    </SharedFrame>
  );
}
