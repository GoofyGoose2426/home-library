import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { BookDetail } from "@/components/book-detail";
import { loadBook } from "@/lib/book";
import { sharedClient } from "@/lib/supabase/shared";
import { LinkOff, SharedFrame } from "../../shared";

export default function SharedBookPage({ params }: PageProps<"/s/[code]/books/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-6">
      <Suspense fallback={<p className="mt-8 text-muted">Opening the book…</p>}>
        <SharedBook params={params} />
      </Suspense>
    </main>
  );
}

async function SharedBook({ params }: Pick<PageProps<"/s/[code]/books/[id]">, "params">) {
  const { code, id } = await params;
  const supabase = await sharedClient(code);
  if (!supabase) return <LinkOff />;
  const book = await loadBook(supabase, id, { shared: true });
  if (!book) notFound();
  return (
    <SharedFrame code={code}>
      <BackLink />
      <BookDetail book={book} readOnly base={`/s/${code}`} />
    </SharedFrame>
  );
}
